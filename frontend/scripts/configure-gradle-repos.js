#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const androidDir = join(projectRoot, 'android');

console.log('🔧 Configuring Gradle repositories...\n');

if (!existsSync(androidDir)) {
  console.log('⚠️  Android directory not found. Run "npx cap sync android" first.');
  process.exit(0);
}

// Configure settings.gradle
const settingsGradlePath = join(androidDir, 'settings.gradle');
if (existsSync(settingsGradlePath)) {
  let settingsContent = readFileSync(settingsGradlePath, 'utf8');
  let needsUpdate = false;
  
  // Ensure pluginManagement block exists (needed for buildscript/plugin dependencies)
  if (!settingsContent.includes('pluginManagement')) {
    console.log('📝 Adding pluginManagement block to settings.gradle...');
    const pluginMgmtBlock = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

`;
    settingsContent = pluginMgmtBlock + settingsContent;
    needsUpdate = true;
  } else {
    // Update existing pluginManagement block
    const pluginMgmtRegex = /pluginManagement\s*\{[^}]*repositories\s*\{([^}]*)\}/s;
    const match = settingsContent.match(pluginMgmtRegex);
    
    if (match) {
      const reposContent = match[1];
      let newReposContent = reposContent;
      
      // Ensure google() is first
      if (!reposContent.includes('google()')) {
        console.log('📝 Adding google() repository to pluginManagement...');
        newReposContent = '        google()\n' + newReposContent;
        needsUpdate = true;
      }
      
      // Ensure mavenCentral() exists
      if (!reposContent.includes('mavenCentral()')) {
        console.log('📝 Adding mavenCentral() repository to pluginManagement...');
        newReposContent += '        mavenCentral()\n';
        needsUpdate = true;
      }
      
      // Ensure gradlePluginPortal() exists
      if (!reposContent.includes('gradlePluginPortal()')) {
        console.log('📝 Adding gradlePluginPortal() repository to pluginManagement...');
        newReposContent += '        gradlePluginPortal()\n';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        settingsContent = settingsContent.replace(pluginMgmtRegex, 
          `pluginManagement {
    repositories {
${newReposContent}    }
}`);
      }
    }
  }
  
  // Ensure dependencyResolutionManagement block exists with proper repositories
  if (!settingsContent.includes('dependencyResolutionManagement')) {
    console.log('📝 Adding dependencyResolutionManagement block to settings.gradle...');
    const newBlock = `dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

`;
    settingsContent = settingsContent.replace(/^pluginManagement\s*\{[^}]*\}/m, (match) => match + '\n\n' + newBlock);
    needsUpdate = true;
  } else {
    // Update existing dependencyResolutionManagement block
    const reposBlockRegex = /dependencyResolutionManagement\s*\{[^}]*repositories\s*\{([^}]*)\}/s;
    const match = settingsContent.match(reposBlockRegex);
    
    if (match) {
      const reposContent = match[1];
      let newReposContent = reposContent;
      
      // Ensure google() is first
      if (!reposContent.includes('google()')) {
        console.log('📝 Adding google() repository to dependencyResolutionManagement...');
        newReposContent = '        google()\n' + newReposContent;
        needsUpdate = true;
      }
      
      // Ensure mavenCentral() exists
      if (!reposContent.includes('mavenCentral()')) {
        console.log('📝 Adding mavenCentral() repository to dependencyResolutionManagement...');
        newReposContent += '        mavenCentral()\n';
        needsUpdate = true;
      }
      
      // Ensure gradlePluginPortal() exists as fallback
      if (!reposContent.includes('gradlePluginPortal()')) {
        console.log('📝 Adding gradlePluginPortal() repository to dependencyResolutionManagement...');
        newReposContent += '        gradlePluginPortal()\n';
        needsUpdate = true;
      }
      
      // Reorder to ensure google() is first
      if (newReposContent.includes('google()') && newReposContent.includes('mavenCentral()')) {
        const lines = newReposContent.split('\n').filter(line => line.trim());
        const googleLine = lines.find(line => line.includes('google()'));
        const mavenLine = lines.find(line => line.includes('mavenCentral()'));
        const pluginLine = lines.find(line => line.includes('gradlePluginPortal()'));
        const otherLines = lines.filter(line => 
          !line.includes('google()') && 
          !line.includes('mavenCentral()') && 
          !line.includes('gradlePluginPortal()')
        );
        
        // Reconstruct with google() first, then mavenCentral(), then gradlePluginPortal(), then others
        const orderedLines = [];
        if (googleLine) orderedLines.push(googleLine);
        if (mavenLine) orderedLines.push(mavenLine);
        if (pluginLine) orderedLines.push(pluginLine);
        orderedLines.push(...otherLines);
        
        newReposContent = orderedLines.map(line => line.trim() ? `        ${line.trim()}` : '').join('\n') + '\n';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        settingsContent = settingsContent.replace(reposBlockRegex, 
          `dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
${newReposContent}    }
}`);
      }
    }
  }
  
  if (needsUpdate) {
    writeFileSync(settingsGradlePath, settingsContent);
    console.log('✅ settings.gradle updated');
  } else {
    console.log('✅ settings.gradle already configured');
  }
} else {
  console.log('⚠️  settings.gradle not found');
}

// Check if FAIL_ON_PROJECT_REPOS mode is enabled in settings.gradle
// If so, we should NOT add repositories to build.gradle files
let failOnProjectRepos = false;
if (existsSync(settingsGradlePath)) {
  const settingsContent = readFileSync(settingsGradlePath, 'utf8');
  failOnProjectRepos = settingsContent.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS');
}

if (failOnProjectRepos) {
  console.log('ℹ️  RepositoriesMode.FAIL_ON_PROJECT_REPOS is enabled');
  console.log('ℹ️  buildscript repositories are allowed and still needed for classpath dependencies');
  console.log('⚠️  Removing repositories from allprojects/subprojects, but keeping buildscript repositories...');
  
  const buildGradlePath = join(androidDir, 'build.gradle');
  if (existsSync(buildGradlePath)) {
    let buildContent = readFileSync(buildGradlePath, 'utf8');
    let modified = false;
    
    // Ensure buildscript has repositories (they're exempt from FAIL_ON_PROJECT_REPOS)
    // buildscript repositories are needed for classpath dependencies like com.android.tools.build:gradle
    if (buildContent.includes('buildscript')) {
      // Extract the buildscript section to check what's in it
      const buildscriptStart = buildContent.indexOf('buildscript');
      if (buildscriptStart !== -1) {
        // Find the end of the buildscript block by counting braces
        let braceCount = 0;
        let inBuildscript = false;
        let buildscriptEnd = -1;
        for (let i = buildscriptStart; i < buildContent.length; i++) {
          if (buildContent[i] === '{') {
            braceCount++;
            inBuildscript = true;
          } else if (buildContent[i] === '}') {
            braceCount--;
            if (inBuildscript && braceCount === 0) {
              buildscriptEnd = i + 1;
              break;
            }
          }
        }
        
        if (buildscriptEnd > buildscriptStart) {
          const buildscriptSection = buildContent.substring(buildscriptStart, buildscriptEnd);
          
          // Check if buildscript already has required repositories
          const hasGoogle = buildscriptSection.includes('google()');
          const hasMavenCentral = buildscriptSection.includes('mavenCentral()');
          const hasRepositories = buildscriptSection.includes('repositories');
          
          if (!hasGoogle || !hasMavenCentral) {
            if (hasRepositories) {
              // Update existing repositories block - find and replace it properly
              console.log('📝 Updating repositories in buildscript block (required for classpath dependencies)...');
              // Find the repositories block start
              const reposStart = buildscriptSection.indexOf('repositories');
              if (reposStart !== -1) {
                // Find the end of repositories block by counting braces
                let reposBraceCount = 0;
                let reposEnd = -1;
                for (let i = reposStart; i < buildscriptSection.length; i++) {
                  if (buildscriptSection[i] === '{') {
                    reposBraceCount++;
                  } else if (buildscriptSection[i] === '}') {
                    reposBraceCount--;
                    if (reposBraceCount === 0) {
                      reposEnd = i + 1;
                      break;
                    }
                  }
                }
                
                if (reposEnd > reposStart) {
                  // Replace the entire repositories block
                  const beforeRepos = buildscriptSection.substring(0, reposStart);
                  const afterRepos = buildscriptSection.substring(reposEnd);
                  const newReposBlock = `repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }`;
                  const updatedSection = beforeRepos + newReposBlock + afterRepos;
                  buildContent = buildContent.substring(0, buildscriptStart) + updatedSection + buildContent.substring(buildscriptEnd);
                  modified = true;
                }
              }
            } else {
              // Add repositories block after buildscript {
              console.log('📝 Adding repositories block to buildscript (required for classpath dependencies)...');
              const updatedSection = buildscriptSection.replace(
                /(buildscript\s*\{)/,
                `$1\n    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }`
              );
              buildContent = buildContent.substring(0, buildscriptStart) + updatedSection + buildContent.substring(buildscriptEnd);
              modified = true;
            }
          } else {
            console.log('✅ buildscript repositories already configured');
          }
        }
      }
    }
    
    // Remove repositories block from allprojects (not allowed with FAIL_ON_PROJECT_REPOS)
    if (buildContent.includes('allprojects') && buildContent.includes('repositories')) {
      console.log('📝 Removing repositories block from allprojects in build.gradle...');
      // Match: allprojects { ... repositories { ... } ... }
      buildContent = buildContent.replace(
        /(allprojects\s*\{[^}]*?)repositories\s*\{[^}]*?\}([^}]*?\})/gs,
        '$1$2'
      );
      modified = true;
    }
    
    // Remove repositories from subprojects if it exists
    if (buildContent.includes('subprojects') && buildContent.includes('repositories')) {
      console.log('📝 Removing repositories block from subprojects in build.gradle...');
      buildContent = buildContent.replace(
        /(subprojects\s*\{[^}]*?)repositories\s*\{[^}]*?\}([^}]*?\})/gs,
        '$1$2'
      );
      modified = true;
    }
    
    if (modified) {
      writeFileSync(buildGradlePath, buildContent);
      console.log('✅ build.gradle updated');
    } else {
      console.log('✅ build.gradle already configured');
    }
  }
  
  // Remove repositories from app/build.gradle (module-level repositories not allowed with FAIL_ON_PROJECT_REPOS)
  const appBuildGradlePath = join(androidDir, 'app', 'build.gradle');
  if (existsSync(appBuildGradlePath)) {
    let appBuildContent = readFileSync(appBuildGradlePath, 'utf8');
    let modified = false;
    
    // Only remove repositories blocks that are NOT in buildscript (android block repositories are also not allowed)
    // Match repositories blocks that are not inside buildscript
    if (appBuildContent.includes('repositories')) {
      // Remove repositories from android block or top-level
      if (!appBuildContent.includes('buildscript')) {
        // No buildscript, safe to remove all repositories
        console.log('📝 Removing repositories block from app/build.gradle...');
        appBuildContent = appBuildContent.replace(/repositories\s*\{[^}]*?\}/gs, '');
        modified = true;
      } else {
        // Has buildscript, only remove repositories outside of buildscript
        // This is tricky, so we'll be more conservative and check context
        console.log('📝 Checking app/build.gradle for repositories outside buildscript...');
        // If repositories appear after android block starts, remove them
        const androidReposRegex = /(android\s*\{[^}]*?)repositories\s*\{[^}]*?\}([^}]*?\})/gs;
        if (androidReposRegex.test(appBuildContent)) {
          appBuildContent = appBuildContent.replace(androidReposRegex, '$1$2');
          modified = true;
        }
      }
    }
    
    if (modified) {
      writeFileSync(appBuildGradlePath, appBuildContent);
      console.log('✅ app/build.gradle cleaned (module-level repositories removed)');
    } else {
      console.log('✅ app/build.gradle already configured');
    }
  }
  
  console.log('✅ Repositories configured: pluginManagement and dependencyResolutionManagement in settings.gradle, buildscript repositories in build.gradle');
} else {
  // If FAIL_ON_PROJECT_REPOS is not enabled, we can add repositories to build.gradle
  console.log('ℹ️  RepositoriesMode.FAIL_ON_PROJECT_REPOS is not enabled - configuring build.gradle repositories');
  
  // Configure build.gradle (project level)
  const buildGradlePath = join(androidDir, 'build.gradle');
  if (existsSync(buildGradlePath)) {
    let buildContent = readFileSync(buildGradlePath, 'utf8');
    let needsUpdate = false;
    
    // Update buildscript repositories
    if (buildContent.includes('buildscript')) {
      const buildscriptRegex = /buildscript\s*\{[^}]*repositories\s*\{([^}]*)\}/s;
      const match = buildContent.match(buildscriptRegex);
      
      if (match) {
        const reposContent = match[1];
        if (!reposContent.includes('google()')) {
          console.log('📝 Adding google() to buildscript repositories in build.gradle...');
          buildContent = buildContent.replace(
            buildscriptRegex,
            (fullMatch, repos) => {
              return fullMatch.replace(
                /repositories\s*\{/,
                `repositories {\n        google()\n        mavenCentral()`
              );
            }
          );
          needsUpdate = true;
        }
      }
    }
    
    // Update allprojects repositories
    if (buildContent.includes('allprojects')) {
      const allprojectsRegex = /allprojects\s*\{[^}]*repositories\s*\{([^}]*)\}/s;
      const match = buildContent.match(allprojectsRegex);
      
      if (match) {
        const reposContent = match[1];
        if (!reposContent.includes('google()')) {
          console.log('📝 Adding google() to allprojects repositories in build.gradle...');
          buildContent = buildContent.replace(
            allprojectsRegex,
            (fullMatch, repos) => {
              return fullMatch.replace(
                /repositories\s*\{/,
                `repositories {\n        google()\n        mavenCentral()`
              );
            }
          );
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      writeFileSync(buildGradlePath, buildContent);
      console.log('✅ build.gradle updated');
    } else {
      console.log('✅ build.gradle already configured');
    }
  } else {
    console.log('⚠️  build.gradle not found');
  }

  // Configure app/build.gradle
  const appBuildGradlePath = join(androidDir, 'app', 'build.gradle');
  if (existsSync(appBuildGradlePath)) {
    let appBuildContent = readFileSync(appBuildGradlePath, 'utf8');
    
    // Check if there are any repository blocks in app/build.gradle
    if (appBuildContent.includes('repositories')) {
      console.log('📝 Checking app/build.gradle for repositories...');
      // Usually app/build.gradle doesn't have repositories, but if it does, ensure google() is there
      if (appBuildContent.includes('repositories') && !appBuildContent.includes('google()')) {
        appBuildContent = appBuildContent.replace(
          /repositories\s*\{/,
          'repositories {\n        google()\n        mavenCentral()'
        );
        writeFileSync(appBuildGradlePath, appBuildContent);
        console.log('✅ app/build.gradle updated');
      }
    }
  }
}

// Configure gradle.properties
const gradlePropsPath = join(androidDir, 'gradle.properties');
let gradleProps = '';
if (existsSync(gradlePropsPath)) {
  gradleProps = readFileSync(gradlePropsPath, 'utf8');
}

const propertiesToAdd = {
  'org.gradle.jvmargs': '-Xmx2048m -Dfile.encoding=UTF-8',
  'org.gradle.parallel': 'true',
  'org.gradle.caching': 'true',
  'org.gradle.daemon': 'true',
  'systemProp.http.connectionTimeout': '120000',
  'systemProp.http.socketTimeout': '120000',
  'systemProp.http.keepAlive': 'true',
  'systemProp.http.maxConnections': '10',
  'android.useAndroidX': 'true',
  'android.enableJetifier': 'true'
};

let propsUpdated = false;
for (const [key, value] of Object.entries(propertiesToAdd)) {
  const regex = new RegExp(`^${key.replace(/\./g, '\\.')}=.*`, 'm');
  if (!gradleProps.match(regex)) {
    console.log(`📝 Adding ${key} to gradle.properties...`);
    gradleProps += `\n${key}=${value}`;
    propsUpdated = true;
  } else {
    // Update if value is different
    const currentMatch = gradleProps.match(regex);
    if (currentMatch && !currentMatch[0].includes(value)) {
      console.log(`📝 Updating ${key} in gradle.properties...`);
      gradleProps = gradleProps.replace(regex, `${key}=${value}`);
      propsUpdated = true;
    }
  }
}

if (propsUpdated) {
  writeFileSync(gradlePropsPath, gradleProps.trim() + '\n');
  console.log('✅ gradle.properties updated');
} else {
  console.log('✅ gradle.properties already configured');
}

console.log('\n✅ Gradle repositories configured successfully!\n');

