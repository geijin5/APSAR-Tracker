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
  
  // Check if we need to add repositories
  if (!settingsContent.includes('google()')) {
    console.log('📝 Updating settings.gradle to add Google Maven repository...');
    needsUpdate = true;
    
    // Add dependencyResolutionManagement block if it doesn't exist
    if (!settingsContent.includes('dependencyResolutionManagement')) {
      // Prepend dependencyResolutionManagement block
      const newBlock = `dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

`;
      settingsContent = newBlock + settingsContent;
    } else {
      // Update existing dependencyResolutionManagement block
      // Add google() before mavenCentral() if mavenCentral exists, otherwise just add google()
      if (settingsContent.includes('mavenCentral()')) {
        settingsContent = settingsContent.replace(
          /(repositories\s*\{[^\n]*\n)/,
          '$1        google()\n'
        );
      } else {
        settingsContent = settingsContent.replace(
          /(repositories\s*\{)/,
          '$1\n        google()'
        );
      }
    }
  }
  
  if (needsUpdate) {
    writeFileSync(settingsGradlePath, settingsContent);
    console.log('✅ settings.gradle updated');
  } else {
    console.log('✅ settings.gradle already configured');
  }
}

// Configure build.gradle (project level)
const buildGradlePath = join(androidDir, 'build.gradle');
if (existsSync(buildGradlePath)) {
  let buildContent = readFileSync(buildGradlePath, 'utf8');
  
  // Ensure allprojects or buildscript has google() repository
  if (buildContent.includes('allprojects') && !buildContent.includes('google()')) {
    console.log('📝 Updating build.gradle (project level)...');
    buildContent = buildContent.replace(
      /allprojects\s*\{[^}]*repositories\s*\{/,
      (match) => {
        if (!match.includes('google()')) {
          return match.replace('repositories {', 'repositories {\n        google()');
        }
        return match;
      }
    );
    writeFileSync(buildGradlePath, buildContent);
    console.log('✅ build.gradle updated');
  }
}

// Configure gradle.properties
const gradlePropsPath = join(androidDir, 'gradle.properties');
let gradleProps = '';
if (existsSync(gradlePropsPath)) {
  gradleProps = readFileSync(gradlePropsPath, 'utf8');
}

if (!gradleProps.includes('org.gradle.jvmargs')) {
  console.log('📝 Creating/updating gradle.properties...');
  gradleProps += '\n# Performance and network settings\n';
  gradleProps += 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\n';
  gradleProps += 'org.gradle.parallel=true\n';
  gradleProps += 'org.gradle.caching=true\n';
  gradleProps += 'org.gradle.daemon=true\n';
  gradleProps += 'systemProp.http.connectionTimeout=60000\n';
  gradleProps += 'systemProp.http.socketTimeout=60000\n';
  writeFileSync(gradlePropsPath, gradleProps);
  console.log('✅ gradle.properties updated');
}

console.log('\n✅ Gradle repositories configured successfully!\n');

