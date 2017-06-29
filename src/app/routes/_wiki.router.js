import WikiEntry from '../models/wikiEntry.model.js';
import WikiTag from '../models/wikiTag.model.js';

export default (app, router, admin) => {

  // query
  router.post('/api/wiki', async (req, res) => {
    try {
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.post('/api/wiki/new', async (req, res) => {
    try {
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.post('/api/wiki/modify', async (req, res) => {
    try {
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.delete('/api/wiki/:id', admin, async (req, res) => {
    try {
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
