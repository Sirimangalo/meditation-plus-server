import WikiEntry from '../models/wikiEntry.model.js';
import WikiTag from '../models/wikiTag.model.js';
import wikiHelper from '../helper/wiki.js';
import youtubeHelper from '../helper/youtube.js';
import regExpEscape from 'escape-string-regexp';

export default (app, router, admin) => {

  /**
   * @api {post} /api/wiki Search for entries (= videos) in the wiki
   * @apiName Search
   * @apiGroup Wiki
   *
   * @apiParam {String}         search      String that matches an entry (title, description)
   * @apiParam {String[]}       tags        List of tags results should contain
   * @apiParam {Number}         limit       Maximum number of returned tags (default: 15)
   * @apiParam {Number}         skip        Number of records to skip during search (default: 0)
   * @apiParam {String}         sortBy      Sort result by this field of the WikiTag model
   * @apiParam {Number/String}  sortOrder   Valid sort option (-1,1,'ascending','descending', ...)
   *
   * @apiSuccess {any[]}        result      List of matching entries
   */
  router.post('/api/wiki', async (req, res) => {
    try {
      const search = req.body.search ? req.body.search : '';
      const limit = req.body.limit ? req.body.limit : 15;
      const skip = req.body.skip ? req.body.skip : 0;

      const query = {};

      if (search) {
        // feature for searching entry by video url
        if (search.match(/url\=/gi) !== null) {
          query['videoId'] = wikiHelper.extractId(search.substring(4));
        } else {
          query['$text'] = {
            $search: search
          }
        }
      }

      if (req.body.tags) {
        query['tags'] = {
          $all: req.body.tags
        }
      }

      const sorting = {};
      const sortBy = req.body.sortBy ? req.body.sortBy : 'publishedAt';
      sorting[sortBy] = req.body.sortOrder ? req.body.sortOrder : 'descending';

      const result = await WikiEntry
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sorting)
        .then();

      res.json(result);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/wiki/new Submit a new video
   * @apiName New
   * @apiGroup Wiki
   *
   * @apiParam {String}         url           Link to a YouTube video from Bhante Yuttadhammo's channel
   * @apiParam {String}         tags          Comma separated list of tags
   * @apiParam {String}         description   Further description of the content (optional)
   */
  router.post('/api/wiki/new', async (req, res) => {
    try {
      let url = req.body.url ? req.body.url : '';
      let tags = req.body.tags ? req.body.tags : '';
      const description = req.body.description ? req.body.description : '';

      // Check for missing params
      // ========================

      if (!(url || tags)) {
        return res.status(400).send('Missing parameters.');
      }

      // Check url validity
      // ==================

      const videoId = wikiHelper.extractId(url);
      if (!videoId) {
        return res.status(400).send('Unsupported url of video.');
      }

      // Check video
      // ===========

      // get video information
      const apiCall = await youtubeHelper.getVideoInfo(videoId);

      if (!apiCall || !apiCall.items || apiCall.items.length === 0) {
        return res.status(400).send('That video was not found.');
      }

      const apiResults = apiCall.items[0];

      // check if found video is not from strange channel.
      // Keeping the list of allowed channels hardcoded
      // since they are supposed to change very rarely.
      const allowedChannels = [
        // https://www.youtube.com/user/yuttadhammo
        'UCQJ6ESCWQotBwtJm0Ff_gyQ'
      ];

      if (allowedChannels.indexOf(apiResults.snippet.channelId) === -1) {
        return res.status(403).send('That video is from an unallowed channel.');
      }

      // extract possibly custom starting position
      let startAt = url.match(/(\?|\&)t\=[0-9]+/gi);
      startAt = startAt ? parseInt(startAt[0].substring(3)) : 0;

      // Check for duplicate entries
      // ===========================

      const duplicate = await WikiEntry
        .findOne({
          videoId: videoId,
          startAt: {
            $gte: startAt > 15 ? startAt - 15 : 0,
            $lte: startAt + 15
          }
        })
        .then();

      if (duplicate && duplicate.user != req.user._doc._id &&
        req.user._doc.role !== 'ROLE_ADMIN') {
        return res.status(403).send('There already exists a duplicate entry for this video.');
      }

      // Check tags
      // ==========

      tags = tags
        .map(s => s.trim())
        .filter(x => x.length > 2 && x.length < 35);

      // try to find at least one tag within the provided ones that already exists
      // on another entry
      const existingTag = await WikiTag
        .findOne({
          _id: { $in: tags }
        })
        .then();

      if (!tags || !existingTag) {
        return res.status(403).send('Please provide at least one existing tag.');
      }

      // All checks done!
      // Continue with adding the new entry. This process is because
      // of the references between the WikiTag and WikiEntry model a bit
      // complicated.

      // first add a new entry without the tags
      let entry = await WikiEntry.create({
        videoId: videoId,
        startAt: startAt,
        title: apiResults.snippet.title,
        description: description ? description : apiResults.snippet.description,
        publishedAt: apiResults.snippet.publishedAt,
        user: req.user._doc
      });

      // update tags
      for (const tag of tags) {
        await WikiTag
          .update({
            _id: tag
          }, {
            _id: tag,
            // increase count of records for tag by 1
            $inc: {
              count: 1
            },
            $addToSet: {
              entries: entry._id,
              related: { $each: tags.filter(x => x !== tag) }
            }
          }, {
            upsert: true
          })
          .then();
      }

      // now add references to tags
      entry.tags = tags;
      await entry.save();

      res.sendStatus(200);
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/wiki/tags Get a list of tags matching certain params
   * @apiName GetTags
   * @apiGroup Wiki
   *
   * @apiParam {String}         search      String that matches a tag's _id
   * @apiParam {String[]}       relatedTo   The _id of a tag to which all returned tags have to be related
   * @apiParam {Boolean}        populate    Whether or not to populate the tags with the associated entries
   * @apiParam {String}         sortBy      A valid field name of the WikiTag model for sorting the result by it
   * @apiParam {Number/String}  sortOrder   Valid sort option for mongodb (-1,1 or 'ascending','descending')
   * @apiParam {Number}         limit       Maximum number of returned tags
   * @apiParam {Number}         skip        Number of records to skip during search
   *
   * @apiSuccess {Number}   increment           value of hours to add
   */
  router.post('/api/wiki/tags', async (req, res) => {
    try {
      const limit = req.body.limit ? req.body.limit : 50;
      const skip = req.body.skip ? req.body.skip : 0;
      const populating = req.body.populate === true ? 'entries' : '';

      // build search query
      const query = {}, sorting = {};

      if (req.body.search) {
        query._id = { $regex: new RegExp('^' + regExpEscape(req.body.search), 'i') };
      }

      if (req.body.relatedTo && req.body.relatedTo.length > 0) {
        query.related = { $in: req.body.relatedTo };
      }

      // set sort of query
      const sortBy = req.body.sortBy ? req.body.sortBy : '_id';
      sorting[sortBy] = req.body.sortOrder ? req.body.sortOrder : 'ascending';

      // find matching tags
      const result = await WikiTag
        .find(query)
        .populate(populating)
        .skip(skip)
        .limit(limit)
        .sort(sorting)
        .then();

      res.json(result);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.delete('/api/wiki/:id', async (req, res) => {
    try {
      let result = await WikiEntry
        .findOne({ _id: req.params.id })
        .exec();

      if (req.user._doc.role !== 'ROLE_ADMIN'
        && result.user != req.user._doc._id) {
        return res.sendStatus(403);
      }

      // remove reference from associated tags
      await WikiTag.update({ entries: result._id }, {
        $pull: { entries: result._id },
        $inc: { count: -1 }
      });

      // remove unused tags
      await WikiTag.remove({
        count: 0
      });

      await result.remove();

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
