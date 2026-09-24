# AI-Powered Gmail Storage Cleaner

An AI-assisted full-stack application that helps users analyze, categorize, and clean unwanted Gmail emails through a secure web interface.

## Project Status

🚧 In active development 

## Problem

Managing large amounts of unwanted, promotional, and newsletter emails manually can be time-consuming.

This project aims to provide a centralized interface for analyzing email metadata, categorizing emails, applying user-defined rules, and safely performing cleanup operations.

## Planned Features

- Google authentication
- Gmail API integration
- Email metadata analysis
- Email categorization
- AI-assisted email classification
- Promotional/newsletter detection
- User-defined cleanup rules
- Protected/whitelisted senders
- Archive and delete operations
- Cleanup history
- Undo/recovery where technically possible
- Cleanup statistics
- React dashboard

## Tech Stack

### Frontend

- React
- JavaScript
- Vite

### Backend

- Node.js
- Express.js
- REST APIs

### Database

- MongoDB
- Mongoose

### Authentication

- Google OAuth 2.0

### External Services

- Gmail API
- LLM API

### Development

- Git
- GitHub
- Docker

## Current Architecture

```text
React Frontend
      |
      | HTTP
      v
Express Backend
      |
      +---- MongoDB
      |
      +---- Gmail API
      |
      +---- LLM API