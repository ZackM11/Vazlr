# Vazlr
Valzr is a volunteer matcher - it matches volunteers with nonprofits. Provides an interface for volunteers and an interface for nonprofits. Includes a tag when we verify a nonprofit as legit. 


### Example `ProjectSourceCode/.env`
A .env.example file has been added so that everyone is able to pull a sample .env. 
Remember the .env should be in .gitignore
```
# database credentials
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="pwd"
POSTGRES_DB="users_db"

# Node vars
SESSION_SECRET="super duper secret!"
```

After adding `ProjectSourceCode/.env`, start the server with
```
cd ProjectSourceCode
docker compose up
```
And your server will be running [here](http://127.0.0.0:3000)

To access the database directly (note that the server must already be running):
```
docker compose exec db psql -U postgres
```
