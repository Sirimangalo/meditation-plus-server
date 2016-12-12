import Wiki from '../models/wiki.model.js';
import youtubeHelper from '../helper/youtube.js';

export default (app, router, io, admin) => {

  router.get('/api/wiki', async (req, res) => {
    try {
      let structure = {};

      // get all entries from database
      let videos = await Wiki
        .find();

      videos.map(entry => {
        const c = entry.category;

        // initialize new object for each category in the structure object
        if (!structure[c]) {
          structure[c] = {
            tags: [],
            count: 0
          };
        }

        // increase counter for videos per category
        structure[c].count++;


        // gather tags for category & dismiss duplicates
        structure[c].tags = structure[c].tags.concat(entry.tags);
        structure[c].tags = [...new Set(structure[c].tags)];
      });

      res.json(structure);
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
      const category = req.body.category ? req.body.category.trim() : '';
      const tags = req.body.tags
          ? req.body.tags
              .split(',')
              .filter(i => {
                return i.trim().length > 0 && i.trim();
              })
          : '';

      // check category & tags
      if (!category || !tags) {
        res.status(400);
        return next('Please provide a category and at least one tag.');
      }

      // try to extract video id from url
      const videoID = req.body.url ? req.body.url.slice(-11) : '';

      // query youtube video info for videoID
      const videoInfo = await youtubeHelper.getVideoInfo(videoID);


      // check if youtube query was successful
      if (!videoInfo.items || !videoInfo.items.length) {
        res.status(400);
        return next('Video URL is invalid.');
      }

      // get video title & length
      const videoTitle = videoInfo.items[0].snippet.title;
      const videoDuration = videoInfo.items[0].contentDetails.duration;

      // check if the video is already in the database
      const duplicate = await Wiki
        .findOne({
          videoID: videoID
        });

      if (duplicate) {
        // if admin: modify entry
        res.status(400);
        return next('This video is already listed.');
      }

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

};
