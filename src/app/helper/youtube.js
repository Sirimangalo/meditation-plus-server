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
  findMatchingVideos: (query) => {
    return new Promise((resolve, reject) => {
      Youtube.authenticate({
        type: 'key',
        key: process.env.YOUTUBE_API_KEY
      });

      Youtube.search.list({
        part: 'snippet',
        channelId: 'UCQJ6ESCWQotBwtJm0Ff_gyQ',
        maxResults: 8,
        q: query
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
