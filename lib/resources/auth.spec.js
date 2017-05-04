const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const request = require('supertest');
chai.use(sinonChai);
const expect = chai.expect;

const fs = require('fs');
const path = require('path');
const express = require('express');
const HttpStatus = require('http-status-codes');
const createAuthorityRouter = require('./auth');
const bodyParser = require('body-parser');
const utils = require('../utils');

const fakeRecordData = fs.readFileSync(path.resolve(__dirname, '../../test-utils/fake-data/record-xml-slim.xml'), 'utf8');
const fakeRecord = utils.parseRecord(fakeRecordData);

describe('Authority Routehandler', () => {
  let app;
  let authorityServiceMock;
  let loggerSpy;

  const fakeCreds = {
    username: 'user',
    password: 'pass'
  };

  beforeEach(() => {

    loggerSpy = {
      log: sinon.spy(),
      error: sinon.spy()
    };

    authorityServiceMock = {
      get: sinon.stub(),
      update: sinon.stub(),
      create: sinon.stub()
    };

    app = express();

    app.use(bodyParser.text({
      type: 'application/xml'
    }));


    const authorityRouteHandler = createAuthorityRouter(authorityServiceMock, loggerSpy);
    app.use('/auth', authorityRouteHandler);

  });

  it('should be a factory function', () => {
    expect(createAuthorityRouter).to.be.a('function');
  });

  describe('get authority record', function() {
    
    it('should respond with the requested record in serialized format', () => {

      authorityServiceMock.get.resolves(fakeRecord);
      
      return request(app)
        .get('/auth/123')
        .expect('Content-Type', /application\/xml/)
        .expect(HttpStatus.OK)
        .then(response => {
          expect(response.text).to.eql(utils.serializeRecord(fakeRecord));
        });
    });


    it('should respond with an error if request fails', () => {

      const authorityReadError = new Error('fake-error-data');
      authorityServiceMock.get.rejects(authorityReadError);
      
      return request(app)
        .get('/auth/123')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should log the error if request fails', () => {

      const authorityReadError = new Error('fake-error-data');
      authorityServiceMock.get.rejects(authorityReadError);
      
      return request(app)
        .get('/auth/123')
        .then(() => {
          expect(loggerSpy.error).to.have.been.calledWith('Error reading authority 123', authorityReadError);
        });
    });

  });

  describe('put authority record', function() {
    
    it('should respond with 401 UNAUTHORIZED if credentials are missing', () => {
      return request(app)
        .put('/auth/123')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should respond with 415 UNSUPPORTED_MEDIA_TYPE if body is missing', () => {
      return request(app)
        .put('/auth/123')
        .auth(fakeCreds.username, fakeCreds.password)
        .expect(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    });

    it('should respond with the updated record', () => {

      const updatedRecordData = 'fake-updated-record-data';

      authorityServiceMock.update.resolves(updatedRecordData);
      
      return request(app)
        .put('/auth/123')
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.OK)
        .expect('Content-Type', /application\/xml/)
        .then(response => {
          expect(response.text).to.eql(updatedRecordData);
          expect(authorityServiceMock.update).to.have.been.calledWith(
            {username: fakeCreds.username, password: fakeCreds.password}, '123', sinon.match.any
          );
        });
    });

    it('should respond with BAD_REQUEST if record is in invalid format', () => {

      const invalidXMLRecordData = 'fake-updated-record-data';

      return request(app)
        .put('/auth/123')
        .auth(fakeCreds.username, fakeCreds.password)
        .send(invalidXMLRecordData)
        .type('application/xml')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('post authority record', function() {
    
    it('should respond with 401 UNAUTHORIZED if credentials are missing', () => {
      return request(app)
        .post('/auth/')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should respond with 415 UNSUPPORTED_MEDIA_TYPE if body is missing', () => {
      return request(app)
        .post('/auth/')
        .auth(fakeCreds.username, fakeCreds.password)
        .expect(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    });

    it('should respond with the updated record', () => {

      const updatedRecordData = 'fake-updated-record-data';

      authorityServiceMock.create.resolves(updatedRecordData);
      
      return request(app)
        .post('/auth/')
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.OK)
        .expect('Content-Type', /application\/xml/)
        .then(response => {
          expect(response.text).to.eql(updatedRecordData);
          expect(authorityServiceMock.create).to.have.been.calledWith(
            {username: fakeCreds.username, password: fakeCreds.password}, sinon.match.any
          );
        });
    });

    it('should respond with BAD_REQUEST if record is in invalid format', () => {

      const invalidXMLRecordData = 'fake-updated-record-data';

      return request(app)
        .post('/auth/')
        .auth(fakeCreds.username, fakeCreds.password)
        .send(invalidXMLRecordData)
        .type('application/xml')
        .expect(HttpStatus.BAD_REQUEST);
    });

  });


});
