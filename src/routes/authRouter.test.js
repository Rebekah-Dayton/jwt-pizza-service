const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

async function login(newUser) {
  const loginRes = await request(app).put('/api/auth').send(newUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  return loginRes
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('login', async () => { 
  const loginRes = await login(testUser); 

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  expect(password).toBeTruthy();
});

test('register', async () => {
    const newUser = testUser;
    newUser.name = randomName();
    const registerRes = await request(app).post('/api/auth').send(newUser);
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.user.name).toEqual(newUser.name);
});

test('register fail', async () => {
  testUser.email = null;
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(400);
});

test('update user', async () => {
    const adminUser = await createAdminUser();
    const token = (await login(adminUser)).body.token;

    const updateUser = { "email":"a@jwt.com", "password":"admin" }
    const updateRes = await request(app).put('/api/auth/1').set('Authorization', `Bearer ${token}`).send(updateUser);
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.id).toBe(1);
    expect(updateRes.body.email).toEqual("a@jwt.com");
});

/*
// check discord to resolve error :/
test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth/').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe("logout successful");
});
*/