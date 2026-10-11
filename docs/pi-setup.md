# Prepare a Raspberry Pi, step by step

You do this once per Pi, from your own Mac. It takes about 45 minutes the first time, most of it waiting. The lab computer never needs any of it.

## What you need

- The Raspberry Pi 4 Model B and the HQ Camera, with its ribbon cable and lens.
- A microSD card, 16 GB or bigger. Everything on it gets erased.
- A way to put that card in your Mac. Most Macs need a small USB-C SD card reader.
- A power supply that gives 5V at 3A. The official Raspberry Pi 15W USB-C supply is the safe pick.
- Wi-Fi with a normal password, like home Wi-Fi or a phone hotspot. More on this in step 1.

## Why nothing showed up

The Pi has no screen, and it never appears on your Mac by itself. Its USB-C port only takes power. It carries no data, so plugging it into a Mac does nothing you can see.

The Pi also does nothing until its card holds an operating system written by Raspberry Pi Imager. A blank card, or the card from an old kit, gives you a red light and nothing else.

A Mac's USB-C port often can't give the Pi enough power. Some early Pi 4 boards won't take power from a USB-C to USB-C cable at all. Use the official supply, or a 3A phone charger with a USB-A to USB-C cable.

If you plugged in an SSD in a USB case, not a microSD card: a Pi 4 can start from one, but use a microSD card here. It's simpler and draws less power.

## 1. Write the card on your Mac

1. Download Raspberry Pi Imager from [raspberrypi.com/software](https://www.raspberrypi.com/software/). Open the download and drag Imager into Applications.
2. Put the microSD card in your Mac.
3. Open Imager. It walks you through a few screens:
   - **Device**: pick **Raspberry Pi 4**.
   - **OS**: pick **Raspberry Pi OS (other)**, then **Raspberry Pi OS Lite (64-bit)**. Lite has no desktop, which is what you want here.
   - **Storage**: pick your microSD card. Check the size matches the card, since it gets wiped.
4. Imager then asks about customisation. Fill in every tab and write down what you type:
   - **Hostname**: `autolab1`. This is the Pi's name on the network.
   - **Localisation**: pick your country's capital city, then check the time zone. This also switches Wi-Fi on for your country, so don't skip it.
   - **User**: username `autolab` (lowercase), and a password you'll remember.
   - **Wi-Fi**: the network name and password, exactly as written. Both are case sensitive. Your Mac must be on this same network for step 4.
   - **Remote Access**: turn on **Enable SSH** and pick **Use password authentication**.
   - **Raspberry Pi Connect**: leave it off.
5. Click **Write**. Your Mac may ask for its own password. Writing and checking takes 5 to 15 minutes. When Imager says it's done, take the card out.

About the Wi-Fi: the Pi needs a network with a plain password. School or work Wi-Fi where you sign in with a username (eduroam and the like) won't work, and neither will one that shows a sign in page. Home Wi-Fi works. A phone hotspot works too: on an iPhone, turn on **Personal Hotspot** and **Maximize Compatibility**, and join it from your Mac as well.

## 2. Put the Pi together

Keep the Pi unplugged for this.

1. **Camera.** On the Pi, find the thin connector marked **CAMERA**, between the micro HDMI ports and the round audio jack. Gently lift the black flap. It rises a couple of millimetres and stays attached. Slide the ribbon in straight, with the silver contacts facing the HDMI ports and the blue strip facing the audio jack. Press the flap back down. Check the other end of the ribbon is seated in the camera the same way. Take the dust cap off the camera and screw the lens on.
2. **Card.** Flip the Pi over. The microSD slot is underneath, at the end opposite the USB ports. Slide the card in with its label facing away from the board, so toward the table once the Pi is the right way up. Push until it stops. There's no click.

## 3. Turn it on

1. Plug in the power supply. There's no switch, the Pi starts on its own.
2. Look at the two small lights next to the power port. The red one means power. The green one means the Pi is reading its card.
3. You want the red light on steadily and the green light flickering. That means it's starting up.
4. Wait 5 minutes. The first start sets things up and restarts once by itself, so don't unplug it.

If the lights look different, see [When something is off](#when-something-is-off).

## 4. Reach the Pi from your Mac

1. Open Terminal: press Command and Space, type `Terminal` and press Return.
2. Type this and press Return:

   ```bash
   ping autolab1.local
   ```

   Lines like `64 bytes from 192.168.1.42` mean the Pi is on the Wi-Fi. Press Control and C to stop. If you get `Unknown host`, wait two more minutes and try again.
3. Connect to it. It's your username, then `@`, then the hostname plus `.local`:

   ```bash
   ssh autolab@autolab1.local
   ```

4. The first time it asks `Are you sure you want to continue connecting (yes/no/[fingerprint])?`. Type `yes` and press Return.
5. Type the Pi's password and press Return. **Nothing shows while you type**, not even dots. That's normal.
6. You're in when the line starts with `autolab@autolab1:~ $`. Everything you type now runs on the Pi.

## 5. Install Autolab

Paste these one at a time and press Return after each.

```bash
sudo apt update && sudo apt install -y git
```

```bash
git clone https://github.com/edison16a/AutoLab.git
```

```bash
~/AutoLab/devices/raspberry-pi/install.sh
```

The first takes a minute or two. The second downloads the code, with no login since the repository is public. The installer takes 10 to 20 minutes and prints a lot. If it ever asks for a password, it's the Pi's password.

It ends like this:

```text
Autolab is installed.

Device ID: 3f9c2a71-...
Setup PIN: 123456
```

Write the PIN on a sticker and put it on the machine. The site asks for it in step 6. The Pi shows up over Bluetooth as `Autolab-` plus the first four characters of the Device ID, here `Autolab-3f9c`.

Check the camera while you're here:

```bash
rpicam-still --list-cameras
```

It should list `imx477`, the HQ Camera's sensor. `No cameras available!` means the ribbon isn't seated. Run `sudo shutdown now`, unplug the Pi once the green light stops, and reseat both ends.

## 6. Connect it to the site over Bluetooth

1. Restart the Pi:

   ```bash
   sudo reboot
   ```

   Terminal says the connection closed, which is expected. Bluetooth setup opens for 10 minutes after every start.
2. Wait a minute. On your Mac, open **Chrome**, not Safari, and go to [auto-lab-web.vercel.app](https://auto-lab-web.vercel.app). Sign in.
3. Click **Connect device**, then **Find Autolab**. If macOS asks whether Chrome may use Bluetooth, click **Allow**.
4. Pick `Autolab-XXXX` from the list and click **Pair**.
5. Enter the Wi-Fi name, the Wi-Fi password and the PIN from the sticker. This is the Wi-Fi the Pi uses from now on, so give it the network where the machine will live. The rules from step 1 apply.
6. Wait for **Ready**. Then open **Live** and the camera should be streaming.

Missed the 10 minutes? Unplug the Pi, plug it back in and try again.

## When something is off

| What you see | What it means | What to do |
| --- | --- | --- |
| No lights at all | No power | Try the official supply, or a 3A phone charger with a USB-A to USB-C cable |
| Red light flickers or goes out | Not enough power | Same as above. Laptop ports often can't keep up |
| Red light on, green never flickers | The Pi can't read the card | Write the card again with Imager and push it all the way in |
| Green blinks the same pattern over and over | A start up error, usually the card | Write the card again with Imager |
| `ping` says `Unknown host` after 10 minutes | The Pi isn't on your Mac's network | Check the Wi-Fi name and password, make sure your Mac is on the same network, or write the card again using a phone hotspot |
| `ssh` says `Permission denied` | Wrong username or password | The username is lowercase. Forgot the password? Write the card again |
| `ssh` says `REMOTE HOST IDENTIFICATION HAS CHANGED` | You wrote the card again, so the Pi has a new key | Run `ssh-keygen -R autolab1.local`, then `ssh` again |
| **Find Autolab** lists nothing | The 10 minutes ran out, or Chrome can't use Bluetooth | Unplug and replug the Pi. In System Settings, Privacy & Security, Bluetooth, turn on Google Chrome |
| Setup stops after "On Wi-Fi, signing in" | That Wi-Fi has no internet, or needs a sign in page | Use another network, like a phone hotspot |

To turn the Pi off safely, run `sudo shutdown now` and unplug it once the green light stops. Pulling the plug while it's running can damage the card.

After setup you don't need Terminal again. The Pi starts by itself after a power cut and goes back online on its own.
