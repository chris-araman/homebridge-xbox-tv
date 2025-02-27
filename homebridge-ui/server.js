const {
  HomebridgePluginUiServer,
  RequestError
} = require('@homebridge/plugin-ui-utils');
const XboxWebApi = require('xbox-webapi');
const fs = require('fs');
const fsPromises = fs.promises;

class PluginUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    this.data = {};

    // clear token
    this.onRequest('/clearToken', this.clearToken.bind(this));

    // start console authorization
    this.onRequest('/startAuthorization', this.getWebApiToken.bind(this));

    // this MUST be called when you are ready to accept requests
    this.ready();
  };

  async clearToken(payload) {
    const host = payload.host;
    const authTokenFile = `${this.homebridgeStoragePath}/xboxTv/authToken_${host.split('.').join('')}`;

    try {
      if (fs.existsSync(authTokenFile) == true) {
        await fsPromises.writeFile(authTokenFile, '');
      };

      return true;
    } catch (e) {
      throw new RequestError('Clear token file failed.', {
        message: e.message
      });
    };
  };

  async getWebApiToken(payload) {

    try {
      const host = payload.host;
      const clientId = payload.clientId;
      const clientSecret = payload.clientSecret;
      const webApiToken = payload.webApiToken;
      const authTokenFile = `${this.homebridgeStoragePath}/xboxTv/authToken_${host.split('.').join('')}`;

      const webApiCheck = XboxWebApi({
        clientId: clientId,
        clientSecret: clientSecret,
        userToken: '',
        userUhs: ''
      });

      try {
        webApiCheck._authentication._tokensFile = authTokenFile;
        const isAuthenticated = await webApiCheck.isAuthenticated();
        this.data = {
          info: 'Console already authorized.',
          status: 0
        };
      } catch (error) {
        if (webApiToken.length > 10) {
          try {
            const authenticationData = await webApiCheck._authentication.getTokenRequest(webApiToken);
            webApiCheck._authentication._tokens.oauth = authenticationData;
            webApiCheck._authentication.saveTokens();
            this.data = {
              info: 'Console successfully authorized and token file saved.',
              status: 2
            };
          } catch (error) {
            this.data = {
              info: 'Authorization or save token file error.',
              status: 3
            };
          };
        } else {
          const oauth2URI = webApiCheck._authentication.generateAuthorizationUrl();
          this.data = {
            info: oauth2URI,
            status: 1
          };
        };
      };

      return this.data;
    } catch (e) {
      throw new RequestError('Failed to return data try again.', {
        message: e.message
      });
    };
  };
};

(() => {
  return new PluginUiServer();
})();