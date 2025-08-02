const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function testWordProcessing(filePath) {
  console.log('🔍 Testing Word document processing...\n');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    return;
  }
  
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(filePath).toLowerCase();
  
  console.log(`📄 File: ${fileName}`);
  console.log(`📁 Extension: ${fileExtension}`);
  
  try {
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`📊 File size: ${fileBuffer.length} bytes`);
    console.log(`🔢 First 10 bytes (hex): ${fileBuffer.slice(0, 10).toString('hex')}`);
    console.log(`🔤 First 50 characters (UTF-8): ${fileBuffer.slice(0, 50).toString('utf8')}`);
    
    if (fileExtension === '.docx') {
      // Check if it's a valid ZIP file (.docx files are ZIP archives)
      if (fileBuffer.length < 4 || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4B) {
        console.log('❌ Not a valid .docx file (missing ZIP header)');
        return;
      }
      
      console.log('✅ File appears to be a valid .docx (has ZIP header)');
      
      // Try mammoth extraction
      console.log('🔄 Attempting mammoth text extraction...');
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (result.value) {
        console.log(`✅ Mammoth extraction successful: ${result.value.length} characters`);
        console.log('📝 First 200 characters:');
        console.log(result.value.substring(0, 200));
        console.log('...');
      } else {
        console.log('❌ Mammoth extraction returned no content');
      }
      
      if (result.messages && result.messages.length > 0) {
        console.log('⚠️  Mammoth messages:');
        result.messages.forEach(msg => console.log(`  - ${msg.message}`));
      }
      
    } else if (fileExtension === '.doc') {
      console.log('❌ .doc files are not supported by mammoth');
    } else {
      console.log('❌ Unsupported file type');
    }
    
  } catch (error) {
    console.error('❌ Error processing file:', error.message);
  }
}

// Usage: node test_word_processing.js <file_path>
const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: node test_word_processing.js <file_path>');
  console.log('Example: node test_word_processing.js ./uploads/contract.docx');
} else {
  testWordProcessing(filePath);
} 