// The file contents for the current environment will overwrite these during build2.
// The build2 system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build2 --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

// tslint:disable-next-line:max-line-length
// import { firebaseConfig } from '../environments/firebase-config'; // please comment on this line when changing the values ​​of firebase {}

export const environment = {
  production: false,
  version: require('../../package.json').version, // https://stackoverflow.com/questions/34907682/how-to-display-app-version-in-angular2
  remoteConfig: true,
  remoteConfigUrl: '/widget-config.json',
  remoteTranslationsUrl: 'http://localhost:3000/',
  loadRemoteTranslations: false,
  firebase: {
    apiKey: 'AIzaSyAltK3Fi8F9TtTGmGdrghcrqsKIOBJBUdo',
    authDomain: 'balanz-chat-21-ionic.firebaseapp.com',
    databaseURL: 'https://balanz-chat-21-ionic.firebaseio.com',
    projectId: 'balanz-chat-21-ionic',
    storageBucket: 'balanz-chat-21-ionic.appspot.com',
    messagingSenderId: '283623487573'
  },
  apiUrl: 'http://localhost:3000/',
  tenant: 'tilechat',
  defaultLang: 'en',
  shemaVersion: '1'
};
