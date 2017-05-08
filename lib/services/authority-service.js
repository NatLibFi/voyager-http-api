// authorityService

const utils = require('../utils');
const constants = require('../constants');

function createAuthorityService(options, batchcatConnector) {

  function getRecord(recordId) {

    const requestUrl = options.fetchApi.url + constants.FETCH_API_PATH_GET_RECORD + '?recordType=auth&recordId=' + recordId;
    return utils.fetchResource(requestUrl, options.fetchApi.options)
      .then((data) => utils.parseRecord(data));
   
  }

  function createRecord(userCredentials, catLocation, record) {
   
    return batchcatConnector.auth.addRecord(record, catLocation, {
      username: userCredentials.username,
      password: userCredentials.password
    });

  }

  function updateRecord(userCredentials, catLocation, recordId, record) {
    
    return batchcatConnector.auth.updateRecord(recordId, record, catLocation, {
      username: userCredentials.username,
      password: userCredentials.password
    });

  }

  function deleteRecord(userCredentials, recordId) {
    return batchcatConnector.auth.deleteRecord(recordId, {
      username: userCredentials.username,
      password: userCredentials.password
    });
  }

  return {
    get: getRecord,
    update: updateRecord,
    create: createRecord,
    delete: deleteRecord
  };
}

module.exports = createAuthorityService;