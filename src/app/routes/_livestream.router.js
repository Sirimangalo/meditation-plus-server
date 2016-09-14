import fetch from 'node-fetch';
import youtubeHelper from '../helper/youtube.js';

export default (app, router) => {

  /**
   * @api {get} /api/live Get live stream data
   * @apiName GetLiveStream
   * @apiGroup LiveStream
   *
   * @apiSuccess {Boolean}  livestream.audioOnline     Audio live stream online?
   * @apiSuccess {String}   livestream.audioUrl        Url to the audio stream
   * @apiSuccess {String}   livestream.youtubeOnline   Video live stream online?
   * @apiSuccess {String}   livestream.youtubeUrl      Url to the video stream
   */
  router.get('/api/live', async (req, res) => {
    const audioUrl = 'https://broadcast.sirimangalo.org/live';

    try {
      const youtubeData = await youtubeHelper.getLivestreamInfo();

      const youtubeOnline = youtubeData.items.length > 0;
      const youtubeId = youtubeOnline ? youtubeData.items[0].id.videoId : null;
      const audioResult = await fetch(audioUrl);

      res.json({
        audioOnline: audioResult.status === 200,
        youtubeOnline,
        audioUrl,
        youtubeId
      });
    } catch (err) {
      res.send(err);
    }
  });
};
