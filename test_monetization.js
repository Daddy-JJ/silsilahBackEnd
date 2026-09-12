const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const app = require('./src/app');
const pool = require('./src/config/database');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

async function request(server, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const port = address.port;

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { ...headers },
    };

    let payload = null;
    if (body) {
      if (typeof body === 'string') {
        payload = body;
      } else {
        payload = JSON.stringify(body);
        if (!reqOptions.headers['Content-Type'] && !reqOptions.headers['content-type']) {
          reqOptions.headers['Content-Type'] = 'application/json';
        }
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING MONETIZATION & ADMIN API TESTS ===\n');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  try {
    // 1. Health check
    const health = await request(server, 'GET', '/api/v1/health');
    assert.strictEqual(health.status, 200, 'Health check failed');
    console.log('✔ Health Check OK');

    // 2. Login as Super Admin
    const adminLogin = await request(server, 'POST', '/api/v1/auth/login', {}, {
      email: 'admin@silsilah.app',
      password: 'password123',
    });
    assert.strictEqual(adminLogin.status, 200, 'Super admin login failed');
    const adminToken = adminLogin.data.data.token;
    const adminUser = adminLogin.data.data.user;
    assert.strictEqual(adminUser.system_role, 'SUPER_ADMIN', 'Expected SUPER_ADMIN role');
    console.log('✔ Super Admin Login OK');

    // 3. Login as Normal User / Contributor
    const userLogin = await request(server, 'POST', '/api/v1/auth/login', {}, {
      email: 'kont1@silsilah.app',
      password: 'password123',
    });
    assert.strictEqual(userLogin.status, 200, 'User login failed');
    const userToken = userLogin.data.data.token;
    console.log('✔ Normal User Login OK');

    // 4. Test Super Admin route protection
    const forbiddenStats = await request(server, 'GET', '/api/v1/admin/stats', {
      Authorization: `Bearer ${userToken}`,
    });
    assert.strictEqual(forbiddenStats.status, 403, 'Normal user should get 403 on /admin/stats');
    console.log('✔ Admin Role RBAC (403 Forbidden for normal user) OK');

    // 5. Test Admin Stats
    const statsRes = await request(server, 'GET', '/api/v1/admin/stats', {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(statsRes.status, 200, 'Admin stats failed');
    console.log('✔ Admin Stats retrieved:', statsRes.data.data);

    // 6. Test Admin Settings GET & PUT
    const settingsGet = await request(server, 'GET', '/api/v1/admin/settings', {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(settingsGet.status, 200, 'Get settings failed');
    console.log('✔ Admin Settings retrieved OK');

    const settingsUpdate = await request(server, 'PUT', '/api/v1/admin/settings', {
      Authorization: `Bearer ${adminToken}`,
    }, {
      duitku_merchant_code: 'D12345',
      duitku_api_key: 'test_api_key_sandbox_123',
      duitku_environment: 'sandbox',
    });
    assert.strictEqual(settingsUpdate.status, 200, 'Update settings failed');
    assert.strictEqual(settingsUpdate.data.data.settings.duitku_merchant_code, 'D12345');
    console.log('✔ Admin Settings Updated (Duitku credentials) OK');

    // 7. Test Admin Upgrade Plans CRUD
    const uniqueKode = `PRO_${Date.now()}`;
    const createPlan = await request(server, 'POST', '/api/v1/admin/plans', {
      Authorization: `Bearer ${adminToken}`,
    }, {
      kode_paket: uniqueKode,
      nama_paket: 'Keluarga Besar Pro (60 Anggota)',
      deskripsi: 'Kapasitas hingga 60 anggota keluarga',
      target_max_members: 60,
      target_max_trees: 1,
      target_max_collaborators: 5,
      harga_normal: 50000,
      harga_promo: 35000,
      is_promo_active: true,
      promo_badge: 'HEMAT 30%',
      is_active: true,
      urutan: 1,
    });
    assert.strictEqual(createPlan.status, 201, 'Create plan failed');
    const createdPlan = createPlan.data.data;
    const planId = createdPlan.id;
    console.log('✔ Plan Created OK:', createdPlan.nama_paket);

    // 8. Public Plans Endpoint
    const publicPlans = await request(server, 'GET', '/api/v1/payments/plans');
    assert.strictEqual(publicPlans.status, 200);
    assert.ok(publicPlans.data.data.length > 0, 'Public plans should have at least 1 plan');
    console.log('✔ Public Plans listing OK');

    // 9. Get Tree ID for Inquiry (using first existing tree)
    const [[demoTree]] = await pool.query("SELECT id, max_members FROM trees LIMIT 1");
    assert.ok(demoTree, 'Demo tree not found');
    console.log(`Demo tree current max_members: ${demoTree.max_members}`);

    // 10. Payment Inquiry
    const inquiryRes = await request(server, 'POST', '/api/v1/payments/inquiry', {
      Authorization: `Bearer ${adminToken}`,
    }, {
      treeId: demoTree.id,
      planId: planId,
      paymentMethod: 'SP',
    });
    assert.strictEqual(inquiryRes.status, 201, 'Payment inquiry failed');
    const inquiryData = inquiryRes.data.data;
    const orderId = inquiryData.merchantOrderId;
    const paymentAmount = inquiryData.amount;
    assert.strictEqual(paymentAmount, 35000, 'Amount should match promo price');
    console.log('✔ Payment Inquiry Created OK! Order ID:', orderId, 'Amount:', paymentAmount);

    // 11. Test Webhook with INVALID signature (Must fail with 400)
    const fakeWebhook = await request(server, 'POST', '/api/v1/payments/duitku/callback', {}, {
      merchantCode: 'D12345',
      amount: String(paymentAmount),
      merchantOrderId: orderId,
      signature: 'invalidsignature123',
      resultCode: '00',
      reference: 'REF-FAKE',
    });
    assert.strictEqual(fakeWebhook.status, 400, 'Invalid signature should return 400');
    console.log('✔ Webhook Invalid Signature rejected with 400 OK');

    // 12. Test Webhook with VALID signature
    const validSignature = md5(`D12345${paymentAmount}${orderId}test_api_key_sandbox_123`);
    const validWebhook = await request(server, 'POST', '/api/v1/payments/duitku/callback', {}, {
      merchantCode: 'D12345',
      amount: String(paymentAmount),
      merchantOrderId: orderId,
      signature: validSignature,
      resultCode: '00',
      reference: 'REF-DUITKU-12345',
    });
    assert.strictEqual(validWebhook.status, 200, 'Valid callback failed');
    assert.strictEqual(validWebhook.data.status, 'SUCCESS');
    console.log('✔ Webhook Valid Signature processed successfully OK');

    // Verify tree max_members updated in database
    const [[updatedTree]] = await pool.query('SELECT max_members FROM trees WHERE id = ?', [demoTree.id]);
    assert.strictEqual(updatedTree.max_members, 60, 'Tree max_members should be upgraded to 60');
    console.log(`✔ Tree quota dynamically upgraded to: ${updatedTree.max_members} nodes!`);

    // 13. Test Idempotency (Sending same callback again)
    const duplicateWebhook = await request(server, 'POST', '/api/v1/payments/duitku/callback', {}, {
      merchantCode: 'D12345',
      amount: String(paymentAmount),
      merchantOrderId: orderId,
      signature: validSignature,
      resultCode: '00',
      reference: 'REF-DUITKU-12345',
    });
    assert.strictEqual(duplicateWebhook.status, 200, 'Idempotent webhook failed');
    assert.ok(duplicateWebhook.data.message.includes('Idempotent'), 'Should be handled idempotently');
    console.log('✔ Webhook Idempotency verified OK');

    // 14. Check Transaction Status endpoint
    const txStatus = await request(server, 'GET', `/api/v1/payments/transactions/${orderId}`, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert.strictEqual(txStatus.status, 200);
    assert.strictEqual(txStatus.data.data.status, 'SUCCESS');
    console.log('✔ Transaction status endpoint OK');

    console.log('\n========================================');
    console.log('ALL MONETIZATION & ADMIN TESTS PASSED! 100%');
    console.log('========================================\n');
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
