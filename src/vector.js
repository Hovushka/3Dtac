class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    norm() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }

    normalize() {
        const length = this.norm();
        return new Vec2(this.x / length, this.y / length);
    }

    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    sub(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    comp(other) {
        const
            tmp_x = Math.abs(this.x - other.x),
            tmp_y = Math.abs(this.y - other.y);

        return (tmp_x < 0.00001) && (tmp_y < 0.00001);
    }

    scale(ratio) {
        return new Vec2(this.x * ratio, this.y * ratio);
    }

    destruct(func) {
        return func(this.x, this.y);
    }
}

export { Vec2 };
