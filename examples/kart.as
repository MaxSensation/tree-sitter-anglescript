#include "common.as"

// A player in the kart game.
namespace Game::Karts
{
    enum Surface { Road, Grass = 2, Ice, }

    funcdef void OnLap(int lap, float time);

    interface IDriveable
    {
        void Steer(float amount);
        float Speed { get const; }
    }

    [editable]
    shared class Kart : IDriveable, Entity
    {
        private float m_speed = 0.0f;
        int laps;
        array<Wheel@> wheels(4);
        OnLap@ onLap;

        Kart(const string &in name)
        {
            super(name);
            @onLap = null;
        }

        ~Kart() {}

        float Speed
        {
            get const { return m_speed; }
            set { m_speed = clamp(value, 0, 120); }
        }

        void Steer(float amount) override
        {
            for (uint i = 0; i < wheels.length(); i++)
                wheels[i].angle = amount * 30.0f;
            if (amount > 0.5f && !drifting) { drifting = true; }
            else if (amount < -0.5f) drifting = true;
            else drifting = false;
        }

        void Update(float dt)
        {
            Wheel@ front = wheels[0];
            if (front is null) return;
            m_speed += dt * (boost ? 2.0f : 1.0f);
            dictionary<string, int> scores = {{"a", 1}};
            auto f = function(a, b) { return a < b; };
            foreach (auto w, auto i : wheels) { w.spin(dt); }
            switch (surface)
            {
            case Surface::Ice: m_speed *= 0.9f; break;
            default: break;
            }
            Kart@ k = cast<Kart>(other);
            int x = int(m_speed) >> 2;
            print("speed: " + m_speed + "\n");
            Game::Karts::Kart@ again = this;
        }
    }

    mixin class Boostable { void Boost() { boost = true; } }

    const int MAX_LAPS = 3, MIN_LAPS = 1;
    float g_time;
}

import void PlaySound(const string &in) from "audio";
typedef float real;

void main()
{
    Game::Karts::Kart kart("Max");
    kart.Steer(0.2f);
    array<int> a = {1, 2, 3};
    int[] b;
    do { a.removeLast(); } while (a.length() > 0);
    try { risky(); } catch { log("failed"); }
}
