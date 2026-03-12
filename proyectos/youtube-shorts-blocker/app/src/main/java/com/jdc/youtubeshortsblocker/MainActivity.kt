package com.jdc.youtubeshortsblocker

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusIcon: ImageView
    private lateinit var statusTitle: TextView
    private lateinit var statusDescription: TextView
    private lateinit var btnAction: Button
    private lateinit var cardStatus: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusIcon = findViewById(R.id.statusIcon)
        statusTitle = findViewById(R.id.statusTitle)
        statusDescription = findViewById(R.id.statusDescription)
        btnAction = findViewById(R.id.btnAction)
        cardStatus = findViewById(R.id.cardStatus)

        btnAction.setOnClickListener {
            openAccessibilitySettings()
        }
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }

    private fun updateUI() {
        val active = isAccessibilityServiceEnabled()
        if (active) {
            cardStatus.backgroundTintList = ContextCompat.getColorStateList(this, R.color.status_active_bg)
            statusIcon.setImageResource(R.drawable.ic_shield_check)
            statusIcon.imageTintList = ContextCompat.getColorStateList(this, R.color.status_active)
            statusTitle.text = getString(R.string.status_active)
            statusTitle.setTextColor(ContextCompat.getColor(this, R.color.status_active))
            statusDescription.text = getString(R.string.status_active_desc)
            btnAction.text = getString(R.string.btn_open_settings)
            btnAction.backgroundTintList = ContextCompat.getColorStateList(this, R.color.status_inactive)
        } else {
            cardStatus.backgroundTintList = ContextCompat.getColorStateList(this, R.color.status_inactive_bg)
            statusIcon.setImageResource(R.drawable.ic_shield_off)
            statusIcon.imageTintList = ContextCompat.getColorStateList(this, R.color.status_inactive)
            statusTitle.text = getString(R.string.status_inactive)
            statusTitle.setTextColor(ContextCompat.getColor(this, R.color.status_inactive))
            statusDescription.text = getString(R.string.status_inactive_desc)
            btnAction.text = getString(R.string.btn_activate)
            btnAction.backgroundTintList = ContextCompat.getColorStateList(this, R.color.status_active)
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val serviceName = "${packageName}/${ShortsBlockerService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return TextUtils.SimpleStringSplitter(':').apply {
            setString(enabledServices)
        }.any { it.equals(serviceName, ignoreCase = true) }
    }

    private fun openAccessibilitySettings() {
        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }
}
