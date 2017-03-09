import WikiEntry from '../models/wiki-entry.model.js';
import WikiCategory from '../models/wiki-category.model.js';
import youtubeHelper from '../helper/youtube.js';

export default (app, router, io, admin) => {

  /**
   * Retrieve the Youtube-Video-ID from a URL
   * @param  {string} url Link to a Youtube-Video
   * @return {string}     Video-ID of the video (if url type supported by pattern)
   */
  function parseVideoID(url) {
    // source:
    // stackoverflow.com/questions/3452546/javascript-regex-how-to-get-youtube-video-id-from-url
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : '';
  }

  router.post('/api/wiki/list', async (req, res) => {
    try {
      const parent = req.body.parent ? req.body.parent : null;

      const categories = await WikiCategory
        .find({
          parent: parent
        })
        .sort({
          name: 1
        });

      const videos = await WikiEntry
        .find({
          category: parent
        })
        .sort({
          title: 1
        });

      res.json({
        categories: categories,
        videos: videos
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/wiki/:category Get all videos of a specific category
   * @apiName ListVideosByCategory
   * @apiGroup Wiki
   *
   * @apiSuccess {Object[]} videos Array of videos
   */
  router.get('/api/wiki/:category', async (req, res) => {
    try {
      if (!req.params.category) {
        res.status(400);
      }

      const videos = await WikiEntry
        .find({
          category: req.params.category
        });

      res.json(videos);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/wiki/video/:videoID Get single video by video's id
   * @apiName GetSingleVideo
   * @apiGroup Wiki
   *
   * @apiSuccess {Object} video Video object
   */
  router.get('/api/wiki/video/:videoID', async (req, res) => {
    try {
      if (!req.params.videoID) {
        res.status(400);
      }

      const video = await WikiEntry
        .findOne({
          videoID: req.params.videoID
        })
        .select('title category tags');

      res.json(video);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/wiki/search Search for videos
   * @apiName SearchVideos
   * @apiGroup Wiki
   *
   * @apiSuccess {Object[]} videos Search result
   */
  router.post('/api/wiki/search', async (req, res) => {
    // requires index: db.getCollection('questions').createIndex( { text: "text" } )
    try {
      const search = req.body.search ? req.body.search : '';
      let videos = await WikiEntry
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

  /**
   * @api {post} /api/wiki Submit a new video or modify an existing one
   * @apiName SubmitVideo
   * @apiGroup Wiki
   */
  router.post('/api/wiki', async (req, res, next) => {
    try {
      const url = req.body.url ? req.body.url : null;
      const category = req.body.category ? req.body.category: null;
      let keywords = req.body.keywords ? req.body.keywords: null;



      // check url, category
      if (!url || !category) {
        res.status(400);
        return next('Please fill out all necessary fields and enter at least one tag.');
      }

      // remove duplicate tags
      if (keywords) {
        keywords = [...new Set(keywords)];
      }

      // try to extract video id from url
      const videoID = parseVideoID(url);

      if (!videoID) {
        res.status(400);
        return next('Cannot extract video id of link.');
      }

      // check if the video is already in the database
      const duplicate = await Wiki
        .findOne({
          videoID: videoID
        });

      if (duplicate && !admin) {
        res.status(400);
        return next('This video is already listed and you don\'t have permission to modify it.');
      }

      if (duplicate && admin) {
        await duplicate.update({
          category: category,
          tags: tags
        });
        // TODO: Error handling?!
      } else {
        // query video's details
        const videoInfo = await youtubeHelper.getVideoInfo(videoID);

        // check if youtube query was successful
        if (!videoInfo.items || !videoInfo.items.length) {
          res.status(400);
          return next('Could not find video for video id "' + videoID + '".');
        }

        // get video's title
        const videoTitle = videoInfo.items[0].snippet.title;

        // create a new database entry
        await Wiki.create({
          title: videoTitle,
          videoID: videoID,
          category: category,
          tags: tags
        });
      }

      res.sendStatus(204);
    } catch (err) {
      res.status(500);
      return next('Internal Error. Please contact someone about this or open a bug report.');
    }
  });

  /**
   * @api {delete} /api/wiki/:id Deletes video from wiki
   * @apiName DeleteVideo
   * @apiGroup Wiki
   */
  router.delete('/api/wiki/:videoID', admin, async (req, res) => {
    try {
      const result = await WikiEntry
        .find({ videoID: req.params.videoID })
        .remove()
        .exec();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

  router.post('/api/wiki/newCategory', async (req, res, next) => {
    try {
      const name = req.body.parent ? req.body.parent : null
      const parent = req.body.parent ? req.body.parent : null;

      if (typeof(name) !== 'string') {
        res.sendStatus(400);
      }

      await WikiCategory.create({
        name: name,
        parent: parent
      });

      res.sendStatus(200);
    } catch (err) {
      res.send(err);
    }
  });
};
