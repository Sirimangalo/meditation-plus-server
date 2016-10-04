import supertest from 'supertest';
import User from '../models/user.model.js';
import { app } from '../../server.conf.js';

export class AuthedSupertest {
  token;
  agent;
  user;
  cleartextPassword;
  email;
  role;
  name;

  constructor(
    name = 'User',
    email = 'user@sirimangalo.org',
    password = 'password',
    role = 'ROLE_USER'
  ) {
    this.name = name;
    this.role = role;
    this.email = email;
    this.agent = supertest(app);
    this.cleartextPassword = password;
  }

  createUser() {
    this.user = new User({
      name: this.name,
      local: {
        email: this.email,
        password: new User().generateHash(this.cleartextPassword)
      },
      role: this.role
    });

    return new Promise((resolve, reject) => {
      this.user.save(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  login() {
    return new Promise((resolve, reject) => {
      this.agent
        .post('/auth/login')
        .send({
          email: this.user.local.email,
          password: this.cleartextPassword
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return reject(err);
          this.token = res.body.token;
          resolve();
        });
    });
  }

  authorize() {
    before(done => {
      this.createUser()
        .then(() => this.login())
        .then(() => done())
        .catch(err => done(err));
    });
    after(done => {
      this.user.remove(err => {
        done(err);
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
