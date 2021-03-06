/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function timer() {
    return process.hrtime.bigint();
}
timer.NS_PER_SEC = 1e9;
timer.NS_PER_MS = 1e6;
timer.typeof = "bigint";
timer.diff = function diff(start: bigint) {
    return Number(timer() - start);
};
timer.diffMs = function diffMs(start: bigint) {
    return Number(timer() - start) / timer.NS_PER_MS;
};

export default timer;
