from os import environ

from smbclient import listdir, register_session

pword = environ.get("WELLS_PASS")

root_dir = r"\\WellsAF\Fac-Staff\ajcd2020"
web_dir = root_dir + r"\My Document\My Webs"
dev_dir = web_dir + r"\tutorials\simer\dev"

register_session(root_dir, username="ajcd2020", password=pword)

for f in listdir(root_dir):
    print(f)

for f in listdir(web_dir):
    print(f)

for f in listdir(dev_dir):
    print(f)

print('done')