const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a', roles: [{ role: Role.Admin }] };
let testUserAuthToken;
let testID;

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function createFranchise() {
    const newFranchise = {name: randomName(), admins: [{email: "f@jwt.com"}]}

    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send(newFranchise);    
    expect(createRes.status).toBe(200);
    expect(createRes.body.name).toBe(newFranchise.name);
    expect(createRes.body.admins[0].id).toBe(3);

    return createRes.body.id;
}
  
beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  await DB.addUser(testUser);
  testUser.password = 'a';

  const loginRes = await request(app).put('/api/auth').send(testUser);

  testUserAuthToken = loginRes.body.token;
  testID = loginRes.body.user.id;
  testUser.id = testID;
  expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('get franchises', async () => {
    const getFranchisesRes = await request(app).get('/api/franchise');
    expect(getFranchisesRes.status).toBe(200);
    expect(getFranchisesRes.body).toBeDefined();
});

test('get user franchises', async () => {
    await createFranchise();
    const getUserFranchisesRes = await request(app).get(`/api/franchise/3`).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getUserFranchisesRes.status).toBe(200);
    expect(getUserFranchisesRes.body[0].admins[0].id).toBe(3);
});

test('create franchise', createFranchise);

test('delete franchise', async () => {
    const franchiseId = await createFranchise();

    const getUserFranchisesRes = await request(app).delete(`/api/franchise/${franchiseId}`).set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getUserFranchisesRes.status).toBe(200);
    expect(getUserFranchisesRes.body.message).toBe("franchise deleted");
});
