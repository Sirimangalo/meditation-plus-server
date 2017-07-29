export default {
  /**
   * Extracts the YouTube video ID from a given url.
   *
   * Credit: https://stackoverflow.com/a/9102270
   *
   * @param  {String} url Link to a YouTube video
   * @return {String}     Extracted ID or empty string
   */
  extractId: (url) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^###\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length == 11 ? match[2] : '';
  }
};

