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
  },

  /**
   * Convert a string of comma separated tags into an array.
   * @param  {String}   str Tags as string
   * @return {String[]}     List of tags as array
   */
  extractTags: (str) =>
    [...new Set(str.split(',').map(s => s.trim()).filter(x => x.length > 2 && x.length < 35))]
};
