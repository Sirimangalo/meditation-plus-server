import { app } from '../../server.conf.js';
import supertest from 'supertest';
import User from '../models/user.model.js';

export class AuthedSupertest {
  token;
  agent = supertest.agent(app);
  user = {
    name: 'User',
    local: {
      email: 'admin@admin.com',
      password: new User().generateHash('password')
    },
    role: 'ROLE_USER'
  };

  createUser(done) {
    User.remove(() => {
      this.user = new User(this.user);

      this.user.save(err => {
        if (err) return done(err);
        done();
      });
    });
  }

  login() {
    return new Promise(resolve => {
      this.agent
        .post('/auth/login')
        .send({
          email: 'admin@admin.com',
          password: 'password'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          this.token = res.body.token;
          resolve();
        });
    });
  }

  authorize() {
    before(done => {
      this.createUser(done);
    });
    before(done => {
      this.login().then(() => {
        done();
      });
    });
  }

  get(url) {
    return this.agent.get(url).set('authorization', 'Bearer ' + this.token);
  }

  post(url) {
    return this.agent.post(url).set('authorization', 'Bearer ' + this.token);
  }

  put(url) {
    return this.agent.put(url).set('authorization', 'Bearer ' + this.token);
  }

  delete(url) {
    return this.agent.delete(url).set('authorization', 'Bearer ' + this.token);
  }
}
