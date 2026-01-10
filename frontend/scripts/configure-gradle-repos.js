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
  
  // Read current content to check what exists
  const hasPluginManagement = settingsContent.includes('pluginManagement');
  const hasDependencyResolutionManagement = settingsContent.includes('dependencyResolutionManagement');
  
  // Build the header blocks that should be at the top
  let headerBlocks = '';
  
  // Add pluginManagement block (must be first)
  if (!hasPluginManagement) {
    console.log('📝 Adding pluginManagement block to settings.gradle...');
    headerBlocks += `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

`;
    needsUpdate = true;
  } else {
    // Update existing pluginManagement if needed
    const pluginMgmtMatch = settingsContent.match(/pluginManagement\s*\{[\s\S]*?repositories\s*\{([\s\S]*?)\}/);
    if (pluginMgmtMatch) {
      const reposContent = pluginMgmtMatch[1];
      if (!reposContent.includes('google()') || !reposContent.includes('mavenCentral()') || !reposContent.includes('gradlePluginPortal()')) {
        console.log('📝 Updating pluginManagement repositories...');
        settingsContent = settingsContent.replace(
          /pluginManagement\s*\{[\s\S]*?repositories\s*\{[\s\S]*?\}/,
          `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}`
        );
        needsUpdate = true;
      }
    }
  }
  
  // Add dependencyResolutionManagement block
  if (!hasDependencyResolutionManagement) {
    console.log('📝 Adding dependencyResolutionManagement block to settings.gradle...');
    headerBlocks += `dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

`;
    needsUpdate = true;
  } else {
    // Update existing dependencyResolutionManagement if needed
    const drmMatch = settingsContent.match(/dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{([\s\S]*?)\}/);
    if (drmMatch) {
      const reposContent = drmMatch[1];
      if (!reposContent.includes('google()') || !reposContent.includes('mavenCentral()') || !reposContent.includes('gradlePluginPortal()')) {
        console.log('📝 Updating dependencyResolutionManagement repositories...');
        // Ensure FAIL_ON_PROJECT_REPOS is set
        settingsContent = settingsContent.replace(
          /dependencyResolutionManagement\s*\{[\s\S]*?\}/,
          `dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}`
        );
        needsUpdate = true;
      } else if (!settingsContent.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS')) {
        // Add FAIL_ON_PROJECT_REPOS if missing
        console.log('📝 Adding RepositoriesMode.FAIL_ON_PROJECT_REPOS...');
        settingsContent = settingsContent.replace(
          /(dependencyResolutionManagement\s*\{)/,
          '$1\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)'
        );
        needsUpdate = true;
      }
    }
  }
  
  // If we need to add header blocks, prepend them to the file (after removing any existing ones that might be incomplete)
  if (headerBlocks && (!hasPluginManagement || !hasDependencyResolutionManagement)) {
    // Remove any existing incomplete blocks at the start
    settingsContent = settingsContent.replace(/^(pluginManagement\s*\{[\s\S]*?\}\s*\n?)+/, '');
    settingsContent = settingsContent.replace(/^(dependencyResolutionManagement\s*\{[\s\S]*?\}\s*\n?)+/, '');
    // Prepend the new header blocks
    settingsContent = headerBlocks + settingsContent.trim() + '\n';
    needsUpdate = true;
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

// Check if FAIL_ON_PROJECT_REPOS mode is enabled
let failOnProjectRepos = false;
if (existsSync(settingsGradlePath)) {
  const settingsContent = readFileSync(settingsGradlePath, 'utf8');
  failOnProjectRepos = settingsContent.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS');
}

const buildGradlePath = join(androidDir, 'build.gradle');
if (existsSync(buildGradlePath)) {
  let buildContent = readFileSync(buildGradlePath, 'utf8');
  let modified = false;
  
  // Always ensure buildscript has repositories (they're exempt from FAIL_ON_PROJECT_REPOS)
  if (buildContent.includes('buildscript')) {
    // Find buildscript block - use a simple approach: find buildscript { and check what's inside
    const buildscriptMatch = buildContent.match(/buildscript\s*\{/);
    if (buildscriptMatch) {
      const buildscriptStart = buildscriptMatch.index;
      // Find the matching closing brace by counting
      let braceCount = 0;
      let buildscriptEnd = -1;
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
            // Replace existing repositories block - find it within buildscript
            console.log('📝 Updating buildscript repositories...');
            // Find repositories { ... } block within buildscript
            const reposMatch = buildscriptSection.match(/repositories\s*\{/);
            if (reposMatch) {
              const reposStart = reposMatch.index;
              let reposBraceCount = 0;
              let reposEnd = -1;
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
                // Replace the repositories block
                const beforeRepos = buildscriptSection.substring(0, reposStart);
                const afterRepos = buildscriptSection.substring(reposEnd + 1);
                const newReposBlock = 'repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }';
                const updatedSection = beforeRepos + newReposBlock + afterRepos;
                buildContent = buildContent.substring(0, buildscriptStart) + updatedSection + buildContent.substring(buildscriptEnd + 1);
                modified = true;
              }
            }
          } else {
            // Add repositories block after buildscript {
            console.log('📝 Adding buildscript repositories...');
            const insertPos = buildscriptStart + buildscriptMatch[0].length;
            const beforeRepos = buildContent.substring(0, insertPos);
            const afterRepos = buildContent.substring(insertPos);
            const newReposBlock = '\n    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }';
            buildContent = beforeRepos + newReposBlock + afterRepos;
            modified = true;
          }
        } else {
          console.log('✅ buildscript repositories already configured');
        }
      }
    }
  }
  
  // Remove repositories from allprojects/subprojects if FAIL_ON_PROJECT_REPOS is enabled
  // Note: buildscript repositories are exempt and should remain
  if (failOnProjectRepos) {
    // Simple regex-based removal - for most Gradle files, repositories blocks are simple
    // Match "allprojects { ... repositories { ... } ... }" and remove the repositories block
    if (buildContent.includes('allprojects') && buildContent.includes('repositories')) {
      console.log('📝 Removing repositories from allprojects (not allowed with FAIL_ON_PROJECT_REPOS)...');
      // Match allprojects block and remove repositories from it (but not from buildscript)
      // Use a multiline regex that matches repositories blocks not in buildscript
      buildContent = buildContent.replace(/(allprojects\s*\{[\s\S]*?)repositories\s*\{[\s\S]*?\n\s*\}\s*([\s\S]*?\})/g, '$1$2');
      modified = true;
    }
    
    if (buildContent.includes('subprojects') && buildContent.includes('repositories')) {
      console.log('📝 Removing repositories from subprojects (not allowed with FAIL_ON_PROJECT_REPOS)...');
      buildContent = buildContent.replace(/(subprojects\s*\{[\s\S]*?)repositories\s*\{[\s\S]*?\n\s*\}\s*([\s\S]*?\})/g, '$1$2');
      modified = true;
    }
  } else {
    // If FAIL_ON_PROJECT_REPOS is not enabled, ensure allprojects has repositories
    if (buildContent.includes('allprojects')) {
      const allprojectsMatch = buildContent.match(/allprojects\s*\{[\s\S]*?repositories\s*\{([\s\S]*?)\}/);
      if (allprojectsMatch) {
        const reposContent = allprojectsMatch[1];
        if (!reposContent.includes('google()')) {
          console.log('📝 Adding google() to allprojects repositories...');
          buildContent = buildContent.replace(
            /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
            '$1\n        google()\n        mavenCentral()'
          );
          modified = true;
        }
      } else if (buildContent.includes('allprojects') && !buildContent.match(/allprojects\s*\{[\s\S]*?repositories/)) {
        // Add repositories block to allprojects if missing
        console.log('📝 Adding repositories to allprojects...');
        buildContent = buildContent.replace(
          /(allprojects\s*\{)/,
          '$1\n    repositories {\n        google()\n        mavenCentral()\n    }'
        );
        modified = true;
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
    let modified = false;
    
    // Remove repositories from android block (not allowed with FAIL_ON_PROJECT_REPOS)
    // But keep buildscript repositories if they exist
    if (appBuildContent.includes('repositories') && appBuildContent.includes('android')) {
      // Match repositories inside android block
      const androidReposMatch = appBuildContent.match(/(android\s*\{[\s\S]*?)repositories\s*\{[^\}]*\}([\s\S]*?\})/);
      if (androidReposMatch) {
        console.log('📝 Removing repositories from android block in app/build.gradle...');
        appBuildContent = appBuildContent.replace(
          /(android\s*\{[\s\S]*?)repositories\s*\{[^\}]*\}([\s\S]*?\})/,
          '$1$2'
        );
        modified = true;
      }
    }
    
    // Remove standalone repositories blocks (but not in buildscript)
    if (appBuildContent.includes('repositories') && !appBuildContent.includes('buildscript')) {
      console.log('📝 Removing repositories from app/build.gradle...');
      appBuildContent = appBuildContent.replace(/repositories\s*\{[^\}]*\}/g, '');
      modified = true;
    }
    
    if (modified) {
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
