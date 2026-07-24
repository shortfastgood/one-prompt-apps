---
description: Prompt to generate a Python script to cut sound sequences
agent: plan
tools: [execute, read, edit, search, web, agent, todo]
---
- I need a new Python script in the attached folder. 
- The script name is sound_cut.py. 
- The script should be able to extract a subsequence from a sound sequence. 
- The script accepts --source as parameter, this parameter points to the sound in input. The parameter is mandatory
- The script accepts --target the path to the output. The parameter is mandatory
- The script accepts --offset as parameter, this is he starting point for the extraction in seconds. The default is 0 seconds. The parameter is optional.
- The scripts accepts --length as parameter, this is the new length of the subsequence in seconds. If the sum of offset and length is greater than the length of the entire original sequence return the tail of the original sequence starting from offset. The parameter is mandatory.
- If any parameter is illegal the script writes out the correct syntax and exits. 
- If any other error occurs a human readable massage is provided.
- The script must support at least mp3 formatted sound files.

