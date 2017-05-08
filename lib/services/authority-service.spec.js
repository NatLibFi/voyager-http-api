const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const expect = chai.expect;

const fs = require('fs');
const path = require('path');
const Record = require('marc-record-js');

const createAuthorityService = require('./authority-service');
const utils = require('../utils');

const fakeRecordData = fs.readFileSync(path.resolve(__dirname, '../../test-utils/fake-data/record-xml-slim.xml'), 'utf8');

describe('Authority Service', () => {

  let mockBatchcatConnector;
  let authorityService;

  const fakeUserCredentials = {
    username: 'fake-username',
    password: 'fake-password'
  };

  const fakeConfig = {
    fetchApi: {
      url: 'fake-test-url'
    }
  };

  beforeEach(() => {

    mockBatchcatConnector = {
      auth: {
        addRecord: sinon.stub(),
        updateRecord: sinon.stub(),
        deleteRecord: sinon.stub()
      }
    };

    sinon.stub(utils, 'fetchResource').callsFake(() => {
      return new Promise((resolve) => resolve(fakeRecordData));
    });

    authorityService = createAuthorityService(fakeConfig, mockBatchcatConnector);

  });
  afterEach(() => {
    utils.fetchResource.restore();
  });

  it('should be a factory function', () => {
    expect(createAuthorityService).to.be.a('function');
  });

  describe('get authority record', () => {
    it('should fetch the record using fetch api', () => {

      return authorityService.get(123)
        .then(data => {
          expect(data).to.be.instanceOf(Record);
          expect(utils.fetchResource).to.have.been.calledWith(sinon.match.string, sinon.match.any);
        });

    });
  });

  describe('create authority record', () => {
    const fakeCatLocationId = 95;
    const fakeRecord = 'fake-record';

    it('should resolve to the recordId of just created record', () => {
      
      mockBatchcatConnector.auth.addRecord.resolves(123);

      return authorityService.create(fakeUserCredentials, fakeCatLocationId, fakeRecord)
        .then(createdRecordId => expect(createdRecordId).to.equal(123));
    });
  });


  describe('update authority record', () => {
    const fakeCatLocationId = 95;
    const fakeRecord = 'fake-record';

    it('should resolve without parameters if update is succesful', () => {
      
      mockBatchcatConnector.auth.updateRecord.resolves();

      return authorityService.update(fakeUserCredentials, fakeCatLocationId, 123, fakeRecord);
    });
  });


  describe('delete authority record', () => {

    it('should resolve without parameters if update is succesful', () => {
      
      mockBatchcatConnector.auth.deleteRecord.resolves();

      return authorityService.update(fakeUserCredentials, 123);
    });
  });
});