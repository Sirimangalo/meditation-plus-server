export default (user) => {
	if (!user || !'lastMeditation' in user || !user.lastMeditation instanceof Date) {
      return false;
    }

    // calculate hours since last meditation
    let diff = Math.abs(new Date().getTime() - user.lastMeditation) / 36e5;

    if (diff <= 3) {
      return true
    }

    return false;
}