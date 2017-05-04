// authorityService

const utils = require('../utils');
const constants = require('../constants');

function createAuthorityService(options, batchcatConnector) {

  function getRecord(recordId) {

    const requestUrl = options.fetchApi.url + constants.FETCH_API_PATH_GET_RECORD + '?recordType=auth&recordId=' + recordId;
    return utils.fetchResource(requestUrl, options.fetchApi.options)
      .then((data) => utils.parseRecord(data));
   
  }

  function updateRecord(userCredentials, library, catLocation, opacSuppress, recordId, record) {
    
    batchcatConnector.auth.addRecord(record, library, catLocation, opacSuppress, {
      username: userCredentials.username,
      password: userCredentials.password
    });

    return recordId;
  }

  function createRecord(userCredentials, library, catLocation, opacSuppress, record) {
   
    const recordId = batchcatConnector.auth.updateRecord(record, library, catLocation, opacSuppress, {
      username: userCredentials.username,
      password: userCredentials.password
    });

    return recordId;
  }

  function deleteRecord(userCredentials, recordId) {
    batchcatConnector.auth.deleteRecord(recordId, {
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