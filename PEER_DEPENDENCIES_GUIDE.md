# Peer Dependencies Guide

## The Problem with `yarn explain peer-requirements`

The command `yarn explain peer-requirements` is only available in Yarn 2+ (Berry). This repository uses Yarn 1.x (Classic), which doesn't have this feature.

## How to Check Peer Dependencies in Yarn 1.x

### Method 1: Using `check-peer-dependencies` (Recommended)

Install and run the `check-peer-dependencies` tool:

```bash
# Check peer dependency issues
npx check-peer-dependencies

# Get suggested solutions
npx check-peer-dependencies --findSolutions

# Auto-install missing peer dependencies (use with caution)
npx check-peer-dependencies --install
```

### Method 2: Using Yarn Install Warnings

Run `yarn install` and look for peer dependency warnings:

```bash
yarn install
```

Look for warnings like:
```
warning "react-scripts > eslint-config-react-app > eslint-plugin-flowtype@8.0.3" has unmet peer dependency "@babel/plugin-syntax-flow@^7.14.5".
```

### Method 3: Manual Check with npm ls

```bash
# List installed packages and their versions
npm ls --depth=0

# Check for peer dependency issues
npm ls --peer
```

## Current Peer Dependency Status

### ✅ Fixed Issues
- **Missing Babel plugins**: Added `@babel/plugin-syntax-flow`, `@babel/plugin-transform-react-jsx`, and `@babel/core` to resolve eslint-plugin-flowtype warnings
- **Yarn install warnings**: No longer shows peer dependency warnings during installation

### ⚠️ Remaining Non-Critical Issues
The following peer dependency conflicts remain but do not affect functionality:

1. **@jest packages version conflicts** (OPTIONAL dependencies):
   - `@jest/transform` and `@jest/types` version mismatches with `ts-jest`
   - `babel-jest` version conflicts
   - These are marked as OPTIONAL and don't break builds or tests

2. **TypeScript ESLint version conflicts**:
   - Multiple versions of `@typescript-eslint/eslint-plugin` required by different packages
   - Current version works correctly for main linting

3. **AJV version conflicts**:
   - Different packages require different major versions of `ajv`
   - Not affecting builds or core functionality

4. **Jest version conflicts**:
   - `jest-watch-typeahead` expects older Jest versions
   - Current Jest 29.x works correctly

### Impact Assessment
- **Build**: ✅ Works perfectly
- **Development**: ✅ All scripts work
- **Testing**: ✅ Tests run (some failures unrelated to peer deps)
- **Linting**: ✅ ESLint works correctly
- **Deployment**: ✅ No issues

## Quick Fix Script

You can run the included scripts to check peer dependencies:

```bash
# Check peer dependencies with detailed analysis
yarn explain-peer-requirements

# Quick check for peer dependency issues
yarn check-peers

# Get solutions for remaining conflicts
yarn check-peers:solutions
```

The `yarn explain-peer-requirements` script provides equivalent functionality to the Yarn 2+ command and gives comprehensive information about peer dependency status.

## Resolution Strategy

1. **For development-only conflicts**: These usually don't affect the production build
2. **For build-breaking conflicts**: Update package versions to satisfy requirements
3. **For testing conflicts**: May cause test failures but not affect production

## Upgrading to Yarn 2+

If you want to use `yarn explain peer-requirements`, you can upgrade to Yarn 2+:

```bash
# Upgrade to Yarn 2+
yarn set version berry

# Then you can use
yarn explain peer-requirements
```

Note: This may require updating other parts of your build pipeline.