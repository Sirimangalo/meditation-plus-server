import Wiki from '../models/wiki.model.js';
import youtubeHelper from '../helper/youtube.js';

export default (app, router, io, admin) => {

  /**
   * @api {get} /api/wiki Get the structure and metadata (categories, tags & count) of all videos
   * @apiName ListWikiStructure
   * @apiGroup Wiki
   */
  router.get('/api/wiki', async (req, res) => {
    try {
      let data = [];

      // get all entries from database
      let videos = await Wiki
        .find()
        .sort({
          category: 1
        });

      // form a structured list of the categories
      for (let i = 0; i < videos.length; i++) {

        // add a new item to the array if the category has changed
        // or the loop was just beginning
        if (i === 0 || videos[i-1].category !== videos[i].category) {
          let entry = {
            name: videos[i].category,
            tags: [],
            count: 0
          };

          data.push(entry);
        }

        let last = data.length - 1;

        // increase count of videos of category by 1
        data[last].count++;

        // combine tags from videos with the rest of tags of the category
        // and dismiss duplicates.
        data[last].tags = [...new Set(data[last].tags.concat(videos[i].tags))];
      }

      res.json(data);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.post('/api/wiki/videos', async (req, res) => {
    try {
      const category = req.body.category;

      if (!category) {
        res.status(400);
      }

      let videos = await Wiki
        .find({
          category: category
        });

      res.json(videos);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.post('/api/wiki/search', async (req, res) => {
    // requires index: db.getCollection('questions').createIndex( { text: "text" } )
    try {
      const search = req.body.search ? req.body.search : '';
      let videos = await Wiki
        .find({
          $text: {
            $search: search
          }
        });

      res.json(videos);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.post('/api/wiki', async (req, res, next) => {
    try {
      // parse params
      const url = req.body.url ? req.body.url.trim() : null;
      const category = req.body.category ? req.body.category.trim() : null;
      // parse tags: ',a,,b,c ,' => ['a', 'b', 'c']
      const tags = req.body.tags
          ? req.body.tags
              .split(',')
              .map(i => i.trim())
              .filter(i => { return i.length > 0; })
          : null;

      // check url, category & tags
      if (!url || !category || !tags) {
        res.status(400);
        return next('Please fill out all necessary fields and provide a category and at least one tag.');
      }

      // try to extract video id from url
      const videoID = req.body.url ? req.body.url.slice(-11) : '';

      // check if the video is already in the database
      const duplicate = await Wiki
        .findOne({
          videoID: videoID
        });

      if (duplicate) {
        // TODO: if admin: modify entry
        res.status(400);
        return next('This video is already listed.');
      }

      // query youtube video info for videoID
      const videoInfo = await youtubeHelper.getVideoInfo(videoID);

      // check if youtube query was successful
      if (!videoInfo.items || !videoInfo.items.length) {
        res.status(400);
        return next('Video URL seems to be invalid.');
      }

      // get video's title & length
      const videoTitle = videoInfo.items[0].snippet.title;
      const videoDuration = videoInfo.items[0].contentDetails.duration;

      // create a new database entry
      await Wiki.create({
        title: videoTitle,
        videoID: videoID,
        duration: videoDuration,
        category: category,
        tags: tags
      });

      res.sendStatus(204);
    } catch (err) {
      res.status(500);
      return next('Internal Error');
    }
  });

  /**
   * @api {delete} /api/wiki/:id Deletes video from wiki
   * @apiName DeleteWikiEntry
   * @apiGroup Wiki
   */
  router.delete('/api/wiki/:videoID', admin, async (req, res) => {
    try {
      const result = await Wiki
        .find({ videoID: req.params.videoID })
        .remove()
        .exec();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

};
