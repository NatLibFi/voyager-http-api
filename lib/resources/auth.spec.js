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
const errorCodes = require('../error-codes');

const fakeRecordData = fs.readFileSync(path.resolve(__dirname, '../../test-utils/fake-data/record-xml-slim.xml'), 'utf8');
const fakeRecord = utils.parseRecord(fakeRecordData);

function createFakeError(message, errorCode) {
  const error = Object.assign(new Error(message), {
    errorCode: errorCode
  });
  return error;
}


describe('Authority Routehandler', () => {
  let app;
  let authorityServiceMock;
  let loggerSpy;

  const fakeCreds = {
    username: 'user',
    password: 'pass'
  };

  const fakeAuthorityRouterOptions = {
    externalURL: 'http://fake-server-external-hostname:3333'
  };

  beforeEach(() => {

    loggerSpy = {
      log: sinon.spy(),
      error: sinon.spy()
    };

    authorityServiceMock = {
      get: sinon.stub(),
      update: sinon.stub(),
      create: sinon.stub(),
      delete: sinon.stub()
    };

    app = express();

    app.use(bodyParser.text({
      type: 'application/xml'
    }));


    const authorityRouteHandler = createAuthorityRouter(authorityServiceMock, loggerSpy, fakeAuthorityRouterOptions);
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

    it('should respond with 404 NOT_FOUND when the record does not exist', () => {
      
      authorityServiceMock.get.rejects({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'NOT_FOUND'
      });
      
      return request(app)
        .get('/auth/123')
        .expect(HttpStatus.NOT_FOUND);
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

    it('should respond with 204 NO_CONTENT when update is successful', () => {
      const fakeCatLocationId = '95';
      authorityServiceMock.update.resolves();
      
      return request(app)
        .put('/auth/123')
        .query({ catLocation: fakeCatLocationId })
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.NO_CONTENT)
        .expect('Content-Type', /application\/xml/)
        .then(() => {
          expect(authorityServiceMock.update).to.have.been.calledWith(
            {username: fakeCreds.username, password: fakeCreds.password}, fakeCatLocationId, '123', sinon.match.any
          );
        });
    });

    it('should respond with BAD_REQUEST if there are missing query parameters', () => {

      authorityServiceMock.update.resolves();
      
      return request(app)
        .put('/auth/123')
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.BAD_REQUEST)
        .then(response => {
          expect(response.body.error.message).to.contain('The following parameters are required');
          expect(response.body.error.message).to.contain('catLocation');
        });
    });

    it('should respond with BAD_REQUEST if record is in invalid format', () => {
      const fakeCatLocationId = '95';
      const invalidXMLRecordData = 'fake-updated-record-data';

      return request(app)
        .put('/auth/123')
        .query({ catLocation: fakeCatLocationId })
        .auth(fakeCreds.username, fakeCreds.password)
        .send(invalidXMLRecordData)
        .type('application/xml')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should respond with NOT_FOUND if record does not exist', () => {
      const fakeCatLocationId = '95';
      authorityServiceMock.update.rejects( createFakeError('fake-error-message', errorCodes.authority.update.invalidRecordID));

      return request(app)
        .put('/auth/123')
        .query({ catLocation: fakeCatLocationId })
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should respond with 401 UNAUTHORIZED when username or password is wrong', () => {
      const fakeCatLocationId = '95';
      authorityServiceMock.update.rejects( createFakeError('fake-error-message', errorCodes.connect.invalidUserNameOrPassword));

      return request(app)
        .put('/auth/123')
        .query({ catLocation: fakeCatLocationId })
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.UNAUTHORIZED);
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

    it('should respond with 201 CREATED with headers indicating newly created record location', () => {
      const fakeCatLocationId = '95';
      const createdRecordId = '1238123';

      authorityServiceMock.create.resolves(createdRecordId);
      
      return request(app)
        .post('/auth/')
        .query({ catLocation: fakeCatLocationId })
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.CREATED)
        .expect('Content-Type', /application\/xml/)
        .expect('Location', 'http://fake-server-external-hostname:3333/auth/1238123')
        .expect('Resource-Id', createdRecordId)
        .then(() => {
          expect(authorityServiceMock.create).to.have.been.calledWith(
            {username: fakeCreds.username, password: fakeCreds.password}, sinon.match.any
          );
        });
    });

    it('should respond with BAD_REQUEST if record is in invalid format', () => {

      const invalidXMLRecordData = 'fake-created-record-data';

      return request(app)
        .post('/auth/')
        .auth(fakeCreds.username, fakeCreds.password)
        .send(invalidXMLRecordData)
        .type('application/xml')
        .expect(HttpStatus.BAD_REQUEST);
    });


    it('should respond with 401 UNAUTHORIZED when username or password is wrong', () => {
      authorityServiceMock.create.rejects( createFakeError('fake-error-message', errorCodes.connect.invalidUserNameOrPassword));
      const fakeCatLocationId = '95';
      
      return request(app)
        .post('/auth/')
        .query({ catLocation: fakeCatLocationId })
        .auth(fakeCreds.username, fakeCreds.password)
        .send(fakeRecordData)
        .type('application/xml')
        .expect(HttpStatus.UNAUTHORIZED);
    });

  });


  describe('delete authority record', function() {
    
    it('should respond with 401 UNAUTHORIZED if credentials are missing', () => {
      return request(app)
        .delete('/auth/123')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should respond with 204 NO_CONTENT when delete is successful', () => {
      authorityServiceMock.delete.resolves();
      
      return request(app)
        .delete('/auth/123')
        .auth(fakeCreds.username, fakeCreds.password)
        .type('application/xml')
        .expect(HttpStatus.NO_CONTENT)
        .expect('Content-Type', /application\/xml/)
        .then(() => {
          expect(authorityServiceMock.delete).to.have.been.calledWith(
            {username: fakeCreds.username, password: fakeCreds.password}, '123'
          );
        });
    });

    it('should respond with 404 NOT_FOUND when the record does not exist', () => {
      authorityServiceMock.delete.rejects( createFakeError('fake-error-message', errorCodes.authority.delete.invalidRecordID));
      
      return request(app)
        .delete('/auth/123')
        .auth(fakeCreds.username, fakeCreds.password)
        .expect(HttpStatus.NOT_FOUND);
    });


    it('should respond with 401 UNAUTHORIZED when username or password is wrong', () => {
      authorityServiceMock.delete.rejects( createFakeError('fake-error-message', errorCodes.connect.invalidUserNameOrPassword));
      
      return request(app)
        .delete('/auth/123')
        .auth(fakeCreds.username, fakeCreds.password)
        .expect(HttpStatus.UNAUTHORIZED);
    });

  });
});

