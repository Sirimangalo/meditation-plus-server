import Wiki from '../models/wiki.model.js';

export default (app, router, io, admin) => {

  // get all videos
  router.get('/api/wiki', async (req, res) => {
    try {
      let videos = await Wiki
        .find()
        .lean()
        .then();

      let categories = [];
      let tags = [];

      categories = categories.concat(videos.filter(function (item) {
          return categories.indexOf(item.category) < 0;
      }));

      tags = tags.concat(videos.filter(function (item) {
          return tags.indexOf(item) < 0;
      }));

      res.json({
        videos: videos,
        categories: categories,
        tags: tags
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

};
