// authorityService

const utils = require('../utils');
const constants = require('../constants');

function createAuthorityService(options, dbConnection, batchcatConnector) {
  function getRecord(recordId) {
    return utils.getRecord(dbConnection, recordId, options.db);
  }

  function createRecord(userCredentials, catLocation, record) {
    return batchcatConnector.auth.addRecord(record, catLocation, {
      username: userCredentials.username,
      password: userCredentials.password
    });
  }

  function updateRecord(userCredentials, catLocation, recordId, record) {
    return utils.getRecordUpdateDate(dbConnection, recordId, options.db).then(
      function(updateDate) {
        return batchcatConnector.auth.updateRecord(recordId, record, catLocation, {
          username: userCredentials.username,
          password: userCredentials.password,
          updateDate: updateDate
        });
      }
    );
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
