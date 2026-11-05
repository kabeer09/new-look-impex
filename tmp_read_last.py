with open(r"C:\Users\KABEER AHMED\OneDrive\Desktop\New Look Impex\backend\app\models.py", "r") as f:
    lines = f.readlines()
for i, line in enumerate(lines[-5:], start=len(lines)-4):
    print(f"{i+1}:{repr(line)}")
