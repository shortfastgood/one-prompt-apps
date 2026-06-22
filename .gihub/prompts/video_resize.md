---
description: Python script for video resizing Prompt
agent: plan
tools: [execute, read, edit, search, web, agent, todo]
---
- I need a new Python script in the attached folder. 
- The script name is vresize.phy. 
- The script should be able to resize an entire video sequence. 
- The script detects the actual size. If no information provided the output size is Full HD (1920x1080 pixels). 
- The script should be able to upsize and to downsize. 
- The script accepts --source as parameter, this parameter points to the video in input. 
- The script accepts --target the path to the output. 
- Both parameters are madatory. 
- The scripts accepts --size as parameter, the parameter overwrites the default an is expressed in the form [width]x[height]. The parameter is optional. 
- If any parameter is illegal the script writes out the correct syntax and exits. 
- If any other error occurs a human readable massage is provided.

