# RESTful HTTP API for the Voyager ILS [![Build Status](https://travis-ci.org/NatLibFi/voyager-http-api.svg)](https://travis-ci.org/NatLibFi/voyager-http-api) [![Test Coverage](https://codeclimate.com/github/NatLibFi/voyager-http-api/badges/coverage.svg)](https://codeclimate.com/github/NatLibFi/voyager-http-api/coverage)

RESTful HTTP API for the Voyager ILS

# Setting up Oracle oracle connection

The tnsnames.ora file must be used for connection. This can be done with TNS_ADMIN environment variable.

Example:
```
TNS_ADMIN=`pwd` LD_LIBRARY_PATH=/opt/instantclient_12_2/ node index.js
```
Example of tnsnames.ora
```
$ cat tnsnames.ora
tunnel =
 (DESCRIPTION =
   (ADDRESS = (PROTOCOL = TCP)(HOST = localhost)(PORT = 1521))
   (CONNECT_DATA =
     (SID = VGER)
   )
 )
```

This example uses oracle in localhost. The repository contains file called `tnsnames.ora.template` which can be used to make the tnsname.ora with sed, for example:
```
cat tnsnames.ora.template | sed 's/%PROTOCOL%/TCP/g' | sed 's/%HOST%/tunnel/g' | sed 's/%SID%/VGER/g' | sed 's/%PORT%/1521/g'
```
## Encrypted communication with the Oracle DB
Encrypted communication can be enabled by generating configuration files like so:
```
cat tnsnames.ora.template | sed 's/%PROTOCOL%/TCPS/g' | sed 's/%HOST%/tunnel/g' | sed 's/%SID%/VGER/g' | sed 's/%PORT%/2484/g'
```

```
cat sqlnet.ora.template | sed 's/%WALLET_DIRECTORY%/\/path\/to\/wallet/g' | sed 's/%HOST%/tunnel/g' | sed 's/%SID%/VGER/g' | sed 's/%PORT%/1521/g'
```
Refer to [official instructions](https://docs.oracle.com/middleware/1213/wls/JDBCA/oraclewallet.htm) for wallet management.

## License and copyright

Copyright (c) 2017-2018 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **Apache License 2.0**.
