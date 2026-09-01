package com.jdc.youtubeshortsblocker

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.content.ContextCompat
import com.google.android.material.switchmaterial.SwitchMaterial

class MainActivity : AppCompatActivity() {

    private lateinit var statusIcon: ImageView
    private lateinit var statusTitle: TextView
    private lateinit var statusDescription: TextView
    private lateinit var btnAction: Button
    private lateinit var cardStatus: CardView
    private lateinit var switchYoutube: SwitchMaterial
    private lateinit var switchInstagram: SwitchMaterial

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusIcon = findViewById(R.id.statusIcon)
        statusTitle = findViewById(R.id.statusTitle)
        statusDescription = findViewById(R.id.statusDescription)
        btnAction = findViewById(R.id.btnAction)
        cardStatus = findViewById(R.id.cardStatus)
        switchYoutube = findViewById(R.id.switchYoutube)
        switchInstagram = findViewById(R.id.switchInstagram)

        btnAction.setOnClickListener {
            openAccessibilitySettings()
        }

        bindToggle(switchYoutube, BlockTarget.YOUTUBE)
        bindToggle(switchInstagram, BlockTarget.INSTAGRAM)
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }

    private fun bindToggle(toggle: SwitchMaterial, target: BlockTarget) {
        toggle.isChecked = BlockerPrefs.isEnabled(this, target)
        toggle.setOnCheckedChangeListener { _, checked ->
            BlockerPrefs.setEnabled(this, target, checked)
        }
    }

    private fun updateUI() {
        // Las preferencias pueden haber cambiado en otra instancia de la pantalla
        switchYoutube.isChecked = BlockerPrefs.isEnabled(this, BlockTarget.YOUTUBE)
        switchInstagram.isChecked = BlockerPrefs.isEnabled(this, BlockTarget.INSTAGRAM)

        val active = isAccessibilityServiceEnabled()
        if (active) {
            cardStatus.setCardBackgroundColor(ContextCompat.getColor(this, R.color.status_active_bg))
            statusIcon.setImageResource(R.drawable.ic_shield_check)
            statusIcon.imageTintList = ContextCompat.getColorStateList(this, R.color.status_active)
            statusTitle.text = getString(R.string.status_active)
            statusTitle.setTextColor(ContextCompat.getColor(this, R.color.status_active))
            statusDescription.text = getString(R.string.status_active_desc)
            btnAction.text = getString(R.string.btn_open_settings)
            btnAction.backgroundTintList = ContextCompat.getColorStateList(this, R.color.status_inactive)
        } else {
            cardStatus.setCardBackgroundColor(ContextCompat.getColor(this, R.color.status_inactive_bg))
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
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        // Buscar por nombre de clase (más robusto que comparación exacta)
        return enabledServices.lowercase().contains(
            ShortsBlockerService::class.java.simpleName.lowercase()
        )
    }

    private fun openAccessibilitySettings() {
        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }
}
