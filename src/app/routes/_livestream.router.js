import moment from 'moment';
import fetch from 'node-fetch';

export default (app, router, io) => {
  /**
   * @api {get} /api/live Get live stream data
   * @apiName GetLiveStream
   * @apiGroup LiveStream
   *
   * @apiSuccess {Boolean}  livestream.online       Live stream online?
   * @apiSuccess {String}   livestream.audioUrl     Url to the audio stream
   */
  router.get('/api/live', async (req, res) => {
    const audioUrl = 'https://broadcast.sirimangalo.org/live';

    try {
      const result = await fetch(audioUrl);

      res.json({
        online: result.status === 200,
        audioUrl
      });
    } catch (err) {
      res.send(err);
    }
  });
};
