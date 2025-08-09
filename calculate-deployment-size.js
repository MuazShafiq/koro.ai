const fs = require('fs');
const path = require('path');

// Read .vercelignore patterns
function readVercelIgnore() {
  try {
    const vercelIgnorePath = path.join(__dirname, '.vercelignore');
    const content = fs.readFileSync(vercelIgnorePath, 'utf8');
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    console.log('No .vercelignore file found');
    return [];
  }
}

// Check if a file should be ignored based on .vercelignore patterns
function shouldIgnore(filePath, ignorePatterns) {
  const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
  
  for (const pattern of ignorePatterns) {
    // Simple pattern matching - can be enhanced for more complex patterns
    if (relativePath.includes(pattern) || 
        relativePath.startsWith(pattern) ||
        path.basename(relativePath) === pattern ||
        relativePath.endsWith(pattern)) {
      return true;
    }
  }
  return false;
}

// Get file size recursively
function getDirectorySize(dirPath, ignorePatterns = []) {
  let totalSize = 0;
  const files = [];
  
  function traverse(currentPath) {
    try {
      const stats = fs.statSync(currentPath);
      
      if (shouldIgnore(currentPath, ignorePatterns)) {
        return;
      }
      
      if (stats.isDirectory()) {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          traverse(path.join(currentPath, item));
        }
      } else {
        const size = stats.size;
        totalSize += size;
        files.push({
          path: path.relative(__dirname, currentPath),
          size: size,
          sizeKB: Math.round(size / 1024 * 100) / 100
        });
      }
    } catch (error) {
      // Skip files that can't be accessed
    }
  }
  
  traverse(dirPath);
  return { totalSize, files };
}

// Main function
function calculateDeploymentSize() {
  console.log('Calculating deployment size...');
  
  const ignorePatterns = readVercelIgnore();
  console.log('\nIgnore patterns from .vercelignore:');
  ignorePatterns.forEach(pattern => console.log(`  - ${pattern}`));
  
  const { totalSize, files } = getDirectorySize(__dirname, ignorePatterns);
  
  console.log('\n=== DEPLOYMENT SIZE ANALYSIS ===');
  console.log(`Total size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100} MB`);
  console.log(`Total files: ${files.length}`);
  
  // Sort files by size (largest first)
  files.sort((a, b) => b.size - a.size);
  
  console.log('\n=== LARGEST FILES ===');
  files.slice(0, 20).forEach(file => {
    console.log(`${file.sizeKB.toString().padStart(8)} KB - ${file.path}`);
  });
  
  // Group by directory
  const dirSizes = {};
  files.forEach(file => {
    const dir = path.dirname(file.path);
    if (!dirSizes[dir]) {
      dirSizes[dir] = { size: 0, count: 0 };
    }
    dirSizes[dir].size += file.size;
    dirSizes[dir].count += 1;
  });
  
  console.log('\n=== SIZE BY DIRECTORY ===');
  Object.entries(dirSizes)
    .sort(([,a], [,b]) => b.size - a.size)
    .slice(0, 15)
    .forEach(([dir, info]) => {
      const sizeMB = Math.round(info.size / 1024 / 1024 * 100) / 100;
      console.log(`${sizeMB.toString().padStart(6)} MB (${info.count} files) - ${dir}`);
    });
  
  if (totalSize > 10 * 1024 * 1024) {
    console.log('\n❌ DEPLOYMENT SIZE EXCEEDS 10MB LIMIT!');
    console.log('Consider adding more patterns to .vercelignore');
  } else {
    console.log('\n✅ Deployment size is within 10MB limit');
  }
}

calculateDeploymentSize();