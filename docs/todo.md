todo:
add subtitle editor (need to make a plan for this, should we do it on the frontend by providing the text via SRT (need to find optimal way to do placements of subtitles like snapping to center etc)

the bottom of the analytics page is still ugly (the account analytics swipe thing you'll see)

when i click monthly vs yearly on the pricing page, it moves the toggle a little

add a preview of the video on the confirmation screen (the last step in the upload flow)

should we give them the raw srt file and let them mess with it?

change from using AWS translate to using a LLM to get the SRT file

should we give the user the final SRT file if they want?
------------------------------------------------------------------------------------------------

for downloading files
https://docs.amplify.aws/gen1/react-native/build-a-backend/storage/download/

sanitize inputs to the s3 bucket, generally sanitize inputs overall for everything lol. make sure file types etc are enforced.

make sure that the s3 buckets contents are getting removed after 1 or 2 days since the videos are stored on instagram

fix the upload URLs for downloading files locally since the URLs aer now subtitled_{video name which isn't perfect}

I think a better way to do translations would be to send the SRT file into an LLM instead of having it go to AWS translate.


   callbackUrls: ['exp://localhost:19000/--/*'], // Update with your Expo callback URLs

production endpoint vs but I have a development environment. nbd but fix before prod


change watermark to False before production

check Blake anderson marketing section of his guide

yt videos on stripe integration, paywalling (in my yt history)

Rich Cottrell for small funding for targeted ad campaigns through google ads

make fire promotional template that creators can build on.

scheduler built in as a pro feature, more videos to higher tiers.

cost is $1320 per 15000 videos approximately

ai writer included? mino recommendation. scheduler for sure, analytics for higher paying customers 



add number of speakers in the video so the user can select how many speakers there are 

drop background audio

highest resolution

time zone optimization for each rwgion, post scheduling

maybe make it so that you have to pay extra for the dashboards (these can be pricey with many users)

fix dashboards to look better


make sure accounts persist and are seen by all of the places they need to be seen (post to accounts list, etc)
