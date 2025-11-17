const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImageUpload() {
  try {
    // Create a simple test image buffer
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    // Create form data
    const formData = new FormData();
    formData.append('images', testImageBuffer, 'test.png');
    formData.append('alt', 'تست تصویر');
    
    // Get auth token (you need to login first)
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@tarashe.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      console.log('Login failed:', loginData);
      return;
    }
    
    console.log('Login successful, testing upload...');
    
    // Test upload
    const uploadResponse = await fetch('http://localhost:5000/api/products/upload-images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const uploadData = await uploadResponse.json();
    console.log('Upload response:', uploadData);
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful!');
      console.log('Images:', uploadData.images);
    } else {
      console.log('❌ Upload failed:', uploadData);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run test
testImageUpload();