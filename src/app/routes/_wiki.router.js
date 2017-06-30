import WikiEntry from '../models/wikiEntry.model.js';
import WikiTag from '../models/wikiTag.model.js';
import youtubeHelper from '../helper/youtube.js';

/**
 * Extracts the YouTube video ID from a url.
 *
 * Credit: https://stackoverflow.com/a/9102270
 *
 * @param  {String} url Link to a YouTube video
 * @return {String}     Extracted ID or empty string
 */
function extractId (url) {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^###\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length == 11 ? match[2] : '';
}

export default (app, router, admin) => {

  router.get('/api/wiki/tags', async (req, res) => {
    try {

    } catch (err) {
      res.status(500).send(err);
    }
  });

  // query
  router.post('/api/wiki', async (req, res) => {
    try {
      // Params:
      // - search text
      // - tags
      // - sortBy?!
    } catch (err) {
      res.status(500).send(err);
    }
  });

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

      const videoId = extractId(url);
      if (!videoId) {
        return res.status(400).send('Unsupported url of video.')
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
        return res.status(403).send('That video is from a channel that is not allowed.');
      }

      // extract possibly custom starting position
      let startAt = url.match(/(\?|\&)t\=[0-9]+/gi);
      startAt = startAt ? parseInt(startAt[0].substring(3)) : 0;

      // update (verified) url to a normalized form
      url = 'https://youtu.be/' + apiResults.id;

      // Check for duplicate entries
      // ===========================

      const duplicate = await WikiEntry
        .findOne({
          url: url,
          startAt: {
            $gte: startAt > 15 ? startAt - 15 : 0,
            $lte: startAt + 15
          }
        })
        .then();

      if (duplicate) {
        return res.status(400).send('There already exists a duplicate entry for this video.');
      }

      // Check tags
      // ==========

      // convert comma separated list of tags into array
      tags = tags.split(',').map(s => s.trim()).filter(x => x.length > 2);

      // remove duplicate items
      tags = [...new Set(tags)];

      // try to find at least one tag within the provided ones that already exists
      // on another entry
      const existingTag = await WikiTag
        .findOne({
          _id: { $in: tags }
        })
        .then();

      if (!tags || !existingTag) {
        return res.status(403).send('Please provide at least one existing tag.')
      }

      // All checks done!
      // Continue with adding new entry to wiki. This process is because
      // of the references between the WikiTag and WikiEntry model a bit
      // complicated.

      // first add a new entry without the tags
      let entry = await WikiEntry.create({
        url: url,
        startAt: startAt,
        title: apiResults.snippet.title,
        description: description ? description : apiResults.snippet.description,
        publishedAt: apiResults.snippet.publishedAt
      });


      // update already existing tags
      for (const tag of tags) {
        await WikiTag
          .update({
            _id: tag
          },{
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

  // modify tags & description
  router.post('/api/wiki/modify', async (req, res) => {
    try {
      // 1. Check if at least 1 tag with more than 1 entries related stays after modification
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.delete('/api/wiki/:id', admin, async (req, res) => {
    try {
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
