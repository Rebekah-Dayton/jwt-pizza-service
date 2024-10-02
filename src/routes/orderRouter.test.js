const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

async function getAdminAuthToken() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  const loginRes = await request(app).put('/api/auth').send(user);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  return loginRes.body.token;
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('get menu', async () => {
    const getRes = await request(app).get('/api/order/menu');
    expect(getRes.status).toBe(200);
    expect(getRes.body).toBeDefined();
});

test('add menu item', async () => {
    const token = await getAdminAuthToken();
    const menuItem = { title: "Student", description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 };
    
    const addRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${token}`).send(menuItem);
    expect(addRes.status).toBe(200);
    expect(addRes.body).toBeDefined();
});


test('fail add menu item', async () => {
    const menuItem = { title: randomName(), description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 };
    
    const addRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testUserAuthToken}`).send(menuItem);
    expect(addRes.status).toBe(403);
    expect(addRes.body).toBeDefined();
});

test('get user orders', async () => {
    const getOrderRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(getOrderRes.status).toBe(200);
    expect(getOrderRes.body.page).toBeGreaterThanOrEqual(1);
});

test('create order', async () => {
    const userOrder = {franchiseId: 1, storeId: 1, items:[{ menuId: 1, description: randomName(), price: 0.05 }]}

    const addRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send(userOrder);
    expect(addRes.status).toBe(200);
    expect(addRes.body.jwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
    
    const { id, ...response } = addRes.body.order;
    expect(response).toEqual(userOrder);
    expect(id).toBeDefined();
});