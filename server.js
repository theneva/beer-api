const fetch = require('universal-fetch');
const jwt = require('jwt-simple');
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('express');

const port = process.env.PORT || 8081;
const app = express();

const secret = 'BEERFAVE IS AMAZING!1one';

app.use(cors());
app.use(bodyParser.json());

const beerServiceUri = process.env.BEER_SERVICE_URI;
const usersServiceUri = process.env.USERS_SERVICE_URI;
const favoritesServiceUri = process.env.FAVORITES_SERVICE_URI;
const recommendationServiceUri = process.env.RECOMMENDATION_SERVICE_URI;

if (!beerServiceUri || !usersServiceUri || !favoritesServiceUri || !recommendationServiceUri) {
  throw new Error(`
  You MUST specify BEER_SERVICE_URI (was ${beerServiceUri});
  USERS_SERVICE_URI (was ${usersServiceUri});
  FAVORITES_SERVICE_URI (was ${favoritesServiceUri});
  RECOMMENDATION_SERVICE_URI (was ${recommendationServiceUri}).
  `);
}

const fetchUsers = () => fetch(`${usersServiceUri}/users`);
const fetchUserByUsername = username => fetch(`${usersServiceUri}/users/${username}`);
const authenticateUser = (username, password) => fetch(`${usersServiceUri}/authenticate`, {
  method: 'post',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({username, password})
});
const fetchBeers = () => fetch(`${beerServiceUri}/beers`);
const fetchFavorites = username => fetch(`${favoritesServiceUri}/favorites/${username}`)

app.get('/', (req, res) => res.send('Hello, world!'));

app.post('/authenticate', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(401).send('Undefined username or password!');
  }

  console.log(`received ${username} / ${password}`);

  authenticateUser(username, password)
      .then(authRes => {
        console.log('authRes.status', authRes.status);
        switch (authRes.status) {
          case 401:
          case 404:
            throw new Error({
              message: 'Wrong username or password.'
            });
          default:
            return authRes.json();
        }
      })
      .then(user => {
        const token = jwt.encode(user, secret);
        return res.send(token);
      })
      .catch(err => {
        console.log('Caught error', err);
        return res.status(401).send('Wrong username or password.');
      });
});

app.get('/beers', (req, res) => {
  fetchBeers()
      .then(res => res.json())
      .then(beers => res.send(beers))
      .catch(err => {
        throw new Error(err)
      });
});

app.get('/me', (req, res) => {
  const token = req.header('X-Token');

  if (!token) {
    return res.status(401).send('You are not logged in!');
  }

  const username = jwt.decode(token, secret).username;

  fetchUserByUsername(username)
      .then(res => res.json())
      .then(user => {
        fetchFavorites(username)
            .then(res => res.json())
            .then(favorites => {
              return res.send({
                user,
                favorites
              });
            });
      })
      .catch(err => {
        throw new Error(err);
      });
});

app.get('/favorites', (req, res) => {
  const token = req.header('X-Token');

  if (!token) {
    return res.status(401).send('You are not logged in!');
  }

  const user = jwt.decode(token, secret);

  fetchFavorites(user.username)
      .then(res => result.json())
      .then(favorites => res.send(favorites))
      .catch(err => {
        throw new Error(err);
      })
});

app.get('/users', (req, res) => {
  // TODO: Require admin role

  fetchUsers()
      .then(res => res.json())
      .then(users => res.send(users))
      .catch(err => {
        throw new Error(err);
      });
});

app.listen(port, () => console.log('listening on port', port));
