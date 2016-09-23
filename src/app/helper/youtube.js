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
  findMatchingVideos: (question) => {
    let keywords = question.replace(' ', '|');

    return new Promise((resolve, reject) => {
      Youtube.authenticate({
        type: 'key',
        key: process.env.YOUTUBE_API_KEY
      });

      Youtube.search.list({
        part: 'snippet',
        channelId: 'UCQJ6ESCWQotBwtJm0Ff_gyQ',
        maxResults: 8,
        q: keywords
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
