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

// Configure settings.gradle - ensure pluginManagement and dependencyResolutionManagement are at the top
const settingsGradlePath = join(androidDir, 'settings.gradle');
if (existsSync(settingsGradlePath)) {
  let settingsContent = readFileSync(settingsGradlePath, 'utf8');
  const originalContent = settingsContent;
  
  // Remove any existing pluginManagement or dependencyResolutionManagement blocks
  // (we'll add correct ones at the top)
  settingsContent = settingsContent.replace(/pluginManagement\s*\{[\s\S]*?\}\s*\n?/g, '');
  settingsContent = settingsContent.replace(/dependencyResolutionManagement\s*\{[\s\S]*?\}\s*\n?/g, '');
  settingsContent = settingsContent.trim();
  
  // Build the required header blocks
  const headerBlocks = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

`;
  
  // Check if header blocks are already present and correct
  if (!originalContent.includes('pluginManagement') || !originalContent.includes('dependencyResolutionManagement') || 
      !originalContent.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS')) {
    console.log('📝 Configuring settings.gradle with pluginManagement and dependencyResolutionManagement...');
    settingsContent = headerBlocks + settingsContent;
    writeFileSync(settingsGradlePath, settingsContent);
    console.log('✅ settings.gradle updated');
  } else {
    // Verify existing blocks have correct repositories
    const hasGoogle = originalContent.includes('google()');
    const hasMavenCentral = originalContent.includes('mavenCentral()');
    const hasFailOnProjectRepos = originalContent.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS');
    
    if (!hasGoogle || !hasMavenCentral || !hasFailOnProjectRepos) {
      console.log('📝 Updating settings.gradle repositories configuration...');
      settingsContent = headerBlocks + settingsContent;
      writeFileSync(settingsGradlePath, settingsContent);
      console.log('✅ settings.gradle updated');
    } else {
      console.log('✅ settings.gradle already configured');
    }
  }
} else {
  console.log('⚠️  settings.gradle not found');
}

// Check if FAIL_ON_PROJECT_REPOS mode is enabled
let failOnProjectRepos = false;
if (existsSync(settingsGradlePath)) {
  const settingsContent = readFileSync(settingsGradlePath, 'utf8');
  failOnProjectRepos = settingsContent.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS');
  console.log(`ℹ️  FAIL_ON_PROJECT_REPOS mode: ${failOnProjectRepos ? 'ENABLED' : 'DISABLED'}`);
}

// Configure build.gradle - ensure buildscript has repositories
const buildGradlePath = join(androidDir, 'build.gradle');
if (existsSync(buildGradlePath)) {
  let buildContent = readFileSync(buildGradlePath, 'utf8');
  let modified = false;
  
  // ALWAYS ensure buildscript has repositories (they're exempt from FAIL_ON_PROJECT_REPOS)
  if (buildContent.includes('buildscript')) {
    // Check if buildscript block has required repositories
    const buildscriptMatch = buildContent.match(/buildscript\s*\{/);
    if (buildscriptMatch) {
      const buildscriptStart = buildscriptMatch.index;
      let braceCount = 0;
      let buildscriptEnd = -1;
      
      // Find the end of buildscript block
      for (let i = buildscriptStart; i < buildContent.length; i++) {
        if (buildContent[i] === '{') braceCount++;
        if (buildContent[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            buildscriptEnd = i;
            break;
          }
        }
      }
      
      if (buildscriptEnd > buildscriptStart) {
        const buildscriptSection = buildContent.substring(buildscriptStart, buildscriptEnd + 1);
        const hasGoogle = buildscriptSection.includes('google()');
        const hasMavenCentral = buildscriptSection.includes('mavenCentral()');
        const hasReposBlock = /repositories\s*\{/.test(buildscriptSection);
        
        if (!hasGoogle || !hasMavenCentral) {
          if (hasReposBlock) {
            // Replace existing repositories block
            console.log('📝 Updating buildscript repositories (required for classpath dependencies)...');
            const reposMatch = buildscriptSection.match(/repositories\s*\{/);
            if (reposMatch) {
              const reposStart = reposMatch.index;
              let reposBraceCount = 0;
              let reposEnd = -1;
              
              // Find end of repositories block
              for (let i = reposStart; i < buildscriptSection.length; i++) {
                if (buildscriptSection[i] === '{') reposBraceCount++;
                if (buildscriptSection[i] === '}') {
                  reposBraceCount--;
                  if (reposBraceCount === 0) {
                    reposEnd = i;
                    break;
                  }
                }
              }
              
              if (reposEnd > reposStart) {
                const beforeRepos = buildscriptSection.substring(0, reposStart);
                const afterRepos = buildscriptSection.substring(reposEnd + 1);
                const newReposBlock = 'repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }';
                const updatedSection = beforeRepos + newReposBlock + afterRepos;
                buildContent = buildContent.substring(0, buildscriptStart) + updatedSection + buildContent.substring(buildscriptEnd + 1);
                modified = true;
              }
            }
          } else {
            // Add repositories block right after "buildscript {"
            console.log('📝 Adding buildscript repositories (required for classpath dependencies)...');
            const insertPos = buildscriptStart + buildscriptMatch[0].length;
            buildContent = buildContent.substring(0, insertPos) + 
              '\n    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }' +
              buildContent.substring(insertPos);
            modified = true;
          }
        } else {
          console.log('✅ buildscript repositories already configured');
        }
      }
    }
  } else {
    console.log('⚠️  No buildscript block found in build.gradle');
  }
  
  // Remove repositories from allprojects/subprojects if FAIL_ON_PROJECT_REPOS is enabled
  if (failOnProjectRepos) {
    // Remove from allprojects
    if (buildContent.includes('allprojects')) {
      const allprojectsMatch = buildContent.match(/allprojects\s*\{/);
      if (allprojectsMatch && buildContent.substring(allprojectsMatch.index).includes('repositories')) {
        console.log('📝 Removing repositories from allprojects (not allowed with FAIL_ON_PROJECT_REPOS)...');
        // Find allprojects block
        let braceCount = 0;
        let allprojectsEnd = -1;
        for (let i = allprojectsMatch.index; i < buildContent.length; i++) {
          if (buildContent[i] === '{') braceCount++;
          if (buildContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              allprojectsEnd = i;
              break;
            }
          }
        }
        if (allprojectsEnd > allprojectsMatch.index) {
          const allprojectsSection = buildContent.substring(allprojectsMatch.index, allprojectsEnd + 1);
          const reposMatch = allprojectsSection.match(/repositories\s*\{/);
          if (reposMatch) {
            let reposBraceCount = 0;
            let reposEnd = -1;
            for (let i = reposMatch.index; i < allprojectsSection.length; i++) {
              if (allprojectsSection[i] === '{') reposBraceCount++;
              if (allprojectsSection[i] === '}') {
                reposBraceCount--;
                if (reposBraceCount === 0) {
                  reposEnd = i;
                  break;
                }
              }
            }
            if (reposEnd > reposMatch.index) {
              const beforeRepos = allprojectsSection.substring(0, reposMatch.index);
              const afterRepos = allprojectsSection.substring(reposEnd + 1);
              const updatedSection = beforeRepos + afterRepos;
              buildContent = buildContent.substring(0, allprojectsMatch.index) + updatedSection + buildContent.substring(allprojectsEnd + 1);
              modified = true;
            }
          }
        }
      }
    }
    
    // Remove from subprojects
    if (buildContent.includes('subprojects')) {
      const subprojectsMatch = buildContent.match(/subprojects\s*\{/);
      if (subprojectsMatch && buildContent.substring(subprojectsMatch.index).includes('repositories')) {
        console.log('📝 Removing repositories from subprojects (not allowed with FAIL_ON_PROJECT_REPOS)...');
        let braceCount = 0;
        let subprojectsEnd = -1;
        for (let i = subprojectsMatch.index; i < buildContent.length; i++) {
          if (buildContent[i] === '{') braceCount++;
          if (buildContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              subprojectsEnd = i;
              break;
            }
          }
        }
        if (subprojectsEnd > subprojectsMatch.index) {
          const subprojectsSection = buildContent.substring(subprojectsMatch.index, subprojectsEnd + 1);
          const reposMatch = subprojectsSection.match(/repositories\s*\{/);
          if (reposMatch) {
            let reposBraceCount = 0;
            let reposEnd = -1;
            for (let i = reposMatch.index; i < subprojectsSection.length; i++) {
              if (subprojectsSection[i] === '{') reposBraceCount++;
              if (subprojectsSection[i] === '}') {
                reposBraceCount--;
                if (reposBraceCount === 0) {
                  reposEnd = i;
                  break;
                }
              }
            }
            if (reposEnd > reposMatch.index) {
              const beforeRepos = subprojectsSection.substring(0, reposMatch.index);
              const afterRepos = subprojectsSection.substring(reposEnd + 1);
              const updatedSection = beforeRepos + afterRepos;
              buildContent = buildContent.substring(0, subprojectsMatch.index) + updatedSection + buildContent.substring(subprojectsEnd + 1);
              modified = true;
            }
          }
        }
      }
    }
  }
  
  if (modified) {
    writeFileSync(buildGradlePath, buildContent);
    console.log('✅ build.gradle updated');
  } else {
    console.log('✅ build.gradle already configured');
  }
} else {
  console.log('⚠️  build.gradle not found');
}

// Remove repositories from app/build.gradle if FAIL_ON_PROJECT_REPOS is enabled
if (failOnProjectRepos) {
  const appBuildGradlePath = join(androidDir, 'app', 'build.gradle');
  if (existsSync(appBuildGradlePath)) {
    let appBuildContent = readFileSync(appBuildGradlePath, 'utf8');
    const originalAppContent = appBuildContent;
    
    // Remove repositories from android block (if exists)
    if (appBuildContent.includes('android') && appBuildContent.includes('repositories')) {
      const androidMatch = appBuildContent.match(/android\s*\{/);
      if (androidMatch) {
        let braceCount = 0;
        let androidEnd = -1;
        for (let i = androidMatch.index; i < appBuildContent.length; i++) {
          if (appBuildContent[i] === '{') braceCount++;
          if (appBuildContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              androidEnd = i;
              break;
            }
          }
        }
        if (androidEnd > androidMatch.index) {
          const androidSection = appBuildContent.substring(androidMatch.index, androidEnd + 1);
          if (/repositories\s*\{/.test(androidSection)) {
            console.log('📝 Removing repositories from android block in app/build.gradle...');
            const reposMatch = androidSection.match(/repositories\s*\{/);
            if (reposMatch) {
              let reposBraceCount = 0;
              let reposEnd = -1;
              for (let i = reposMatch.index; i < androidSection.length; i++) {
                if (androidSection[i] === '{') reposBraceCount++;
                if (androidSection[i] === '}') {
                  reposBraceCount--;
                  if (reposBraceCount === 0) {
                    reposEnd = i;
                    break;
                  }
                }
              }
              if (reposEnd > reposMatch.index) {
                const beforeRepos = androidSection.substring(0, reposMatch.index);
                const afterRepos = androidSection.substring(reposEnd + 1);
                const updatedSection = beforeRepos + afterRepos;
                appBuildContent = appBuildContent.substring(0, androidMatch.index) + updatedSection + appBuildContent.substring(androidEnd + 1);
              }
            }
          }
        }
      }
    }
    
    // Remove any standalone repositories blocks (but keep buildscript if it exists)
    if (appBuildContent.includes('repositories') && !appBuildContent.includes('buildscript')) {
      // Simple removal - repositories blocks not in buildscript
      appBuildContent = appBuildContent.replace(/^\s*repositories\s*\{[\s\S]*?\}\s*$/gm, '');
    }
    
    if (appBuildContent !== originalAppContent) {
      writeFileSync(appBuildGradlePath, appBuildContent);
      console.log('✅ app/build.gradle cleaned');
    } else {
      console.log('✅ app/build.gradle already configured');
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
