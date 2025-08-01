# Git Workflow Guide - Single Master Branch Setup

## Current Status Analysis

Your Git repository is correctly configured with:
- ✅ Single `master` branch as the main branch
- ✅ Proper remote origin connection to GitHub
- ✅ Clean working directory
- ✅ Proper branch tracking configuration

## Issue Resolution: Preventing Multiple Master Branches

The issue you're experiencing likely stems from workflow practices rather than Git configuration. Here's how to ensure all commits go to the single master branch:

### 1. Proper Commit and Push Workflow

```bash
# Always check your current branch before making changes
git branch

# Ensure you're on master branch
git checkout master

# Pull latest changes before making new commits
git pull origin master

# Stage your changes
git add .

# Commit with descriptive message
git commit -m "your commit message"

# Push to master branch
git push origin master
```

### 2. Avoid Creating New Branches Accidentally

**DO NOT use these commands unless intentionally creating a new branch:**
```bash
# These create new branches - AVOID unless needed
git checkout -b new-branch-name
git branch new-branch-name
git switch -c new-branch-name
```

### 3. Configure Git to Always Push to Current Branch

```bash
# Set push behavior to current branch only
git config --global push.default current

# Set pull behavior to avoid merge commits
git config --global pull.rebase true
```

### 4. Vercel Deployment Configuration

To prevent unnecessary deployments on every commit:

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Git" section
   - Set "Production Branch" to `master`
   - Disable "Auto-deploy" for other branches if any exist

2. **Optional: Add Vercel Configuration File**
   Create `vercel.json` in your project root:
   ```json
   {
     "git": {
       "deploymentEnabled": {
         "master": true
       }
     }
   }
   ```

### 5. Daily Workflow Best Practices

1. **Before starting work:**
   ```bash
   git status
   git pull origin master
   ```

2. **After making changes:**
   ```bash
   git add .
   git commit -m "descriptive message"
   git push origin master
   ```

3. **If you accidentally create a branch:**
   ```bash
   # Switch back to master
   git checkout master
   
   # Delete the unwanted branch
   git branch -d unwanted-branch-name
   
   # If it was pushed to remote, delete it there too
   git push origin --delete unwanted-branch-name
   ```

### 6. Troubleshooting Common Issues

**Issue: "Your branch is ahead of origin/master"**
```bash
git push origin master
```

**Issue: "Your branch is behind origin/master"**
```bash
git pull origin master
```

**Issue: Merge conflicts**
```bash
git pull origin master
# Resolve conflicts in your editor
git add .
git commit -m "resolve merge conflicts"
git push origin master
```

### 7. Verification Commands

Use these commands to verify your setup:

```bash
# Check current branch
git branch

# Check remote tracking
git branch -vv

# Check recent commits
git log --oneline -5

# Check if working directory is clean
git status
```

## Summary

Your Git repository is properly configured. The key to maintaining a single master branch workflow is:

1. Always work on the `master` branch
2. Pull before making changes
3. Commit and push regularly
4. Avoid creating new branches unless specifically needed
5. Configure Vercel to only deploy from `master` branch

Following this workflow will ensure all your commits go to the single master branch and prevent unnecessary Vercel deployments.