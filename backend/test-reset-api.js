require('dotenv').config();
const http = require('http');

// First login to get auth cookie, then reset password
const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (loginRes) => {
  let body = '';
  loginRes.on('data', d => body += d);
  loginRes.on('end', () => {
    console.log('Login response:', body.substring(0, 200));
    
    // Get cookie from response
    const cookies = loginRes.headers['set-cookie'];
    console.log('Cookies:', cookies);
    
    if (!cookies) {
      console.log('No cookies returned - trying reset without auth');
    }
    
    const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
    
    // Now reset student password
    const resetData = JSON.stringify({ userId: '260008', newPassword: '260008' });
    const resetReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookieStr
      }
    }, (resetRes) => {
      let resetBody = '';
      resetRes.on('data', d => resetBody += d);
      resetRes.on('end', () => {
        console.log('\nReset status:', resetRes.statusCode);
        console.log('Reset response:', resetBody);
        process.exit(0);
      });
    });
    
    resetReq.write(resetData);
    resetReq.end();
  });
});

loginReq.write(loginData);
loginReq.end();
