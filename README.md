## Disclaimer
The app uses node v11 and the experimental support for ES Modules.

## Running the app

#### Download Dependencies
```bash
$ nvm use && yarn
```

#### Start db and run
Start local mongo db of version 4.0 with replicSet support, then start the app.
```bash
$ docker-compose up --build -d mongo
$ yarn start
```
