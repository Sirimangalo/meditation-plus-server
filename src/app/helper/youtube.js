import Youtube from 'youtube-api';

export default {
  getLivestreamInfo: () => {
    return new Promise((resolve, reject) => {
      Youtube.authenticate({
        type: 'key',
        key: process.env.YOUTUBE_API_KEY
      });

      Youtube.search.list({
        part: 'snippet',
        channelId: 'UCQJ6ESCWQotBwtJm0Ff_gyQ',
        type: 'video',
        eventType: 'live'
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    });
  },
  getVideoInfo: (videoid) => {
    return new Promise((resolve, reject) => {
      Youtube.authenticate({
        type: 'key',
        key: process.env.YOUTUBE_API_KEY
      });

      Youtube.videos.list({
        part: 'snippet',
        id: videoid
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    });
  },
  findMatchingVideos: (query, limit = 10) => {
    return new Promise((resolve, reject) => {
      Youtube.authenticate({
        type: 'key',
        key: process.env.YOUTUBE_API_KEY
      });

      Youtube.search.list({
        part: 'snippet',
        channelId: 'UCQJ6ESCWQotBwtJm0Ff_gyQ',
        maxResults: limit,
        q: query
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    });
  },
  findBroadcastURL: (broadcast) => {
    return new Promise((resolve, reject) => {
      Youtube.authenticate({
        type: 'key',
        key: process.env.YOUTUBE_API_KEY
      });

      Youtube.search.list({
        part: 'snippet',
        channelId: 'UCQJ6ESCWQotBwtJm0Ff_gyQ',
        type: 'video',
        eventType: 'completed',
        maxResults: 1,
        publishedAfter: broadcast.ended.toISOString()
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    });
  }
};
